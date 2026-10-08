#!/usr/bin/env python3
"""
patch_variants.py (v3)

Добавляет суффиксы _k / _a к опкодам модулей с двумя вариантами.
Добавляет теги ;@ variant и ;@ default (у ПЕРВОГО варианта).
Автоматически вычисляет ;@ strict по совпадениям ins между вариантами.

Правила:
  - ;@ strict[i] = 1, если ins[i] совпадает у ВСЕХ вариантов (не переключается).
  - ;@ strict[i] = 0, если ins[i] различается (триггер переключения).
  - Если ;@ strict уже есть с хотя бы одной 1 — НЕ перезаписываем (ручная разметка).
  - Одиночные модули — не трогаем.
  - Больше 2 вариантов — не трогаем (ручная разметка).
  - Суффиксы не дублируем.
  - ;@ default ставится ПЕРВОМУ варианту. Если он был у другого — переносим.
  - infer_suffix учитывает только ins, смешанные → по индексу (0 = k, 1 = a).
  - Теги, встреченные ДО ;@ ins — привязываются к следующему блоку.

Использование:
    python patch_variants.py ../csound/modules/
    python patch_variants.py ../csound/modules/40.txt
    python patch_variants.py ../csound/modules/ --dry
    python patch_variants.py ../csound/modules/ --no-backup
"""

import argparse
import re
import shutil
import sys
from pathlib import Path


# ─────────────────────────────────────────────────────────────
#  Парсинг UDO-файла
# ─────────────────────────────────────────────────────────────

def parse_blocks(text: str):
    """Учитывает теги variant/strict как ДО, так и ПОСЛЕ ;@ ins."""
    lines = text.split('\n')
    blocks = []
    pending = None

    pre_variant_tag = None
    pre_variant_default = False
    pre_variant_line_idx = None
    pre_strict_mask = None
    pre_strict_line_idx = None

    for i, line in enumerate(lines):
        stripped = line.strip()

        m_ins = re.match(r'^;\s*@\s*ins\s+(.+)$', stripped)
        if m_ins:
            if pending is not None and pending.get('opcode_name'):
                blocks.append(pending)
            pending = {
                'ins': m_ins.group(1).split(),
                'outs': None,
                'variant_tag': pre_variant_tag,
                'variant_default': pre_variant_default,
                'opcode_line_idx': None,
                'opcode_name': None,
                'ins_line_idx': i,
                'outs_line_idx': None,
                'variant_line_idx': pre_variant_line_idx,
                'strict_line_idx': pre_strict_line_idx,
                'strict_mask': pre_strict_mask,
            }
            pre_variant_tag = None
            pre_variant_default = False
            pre_variant_line_idx = None
            pre_strict_mask = None
            pre_strict_line_idx = None
            continue

        m_outs = re.match(r'^;\s*@\s*outs\s+(.+)$', stripped)
        if m_outs and pending is not None:
            pending['outs'] = m_outs.group(1).split()
            pending['outs_line_idx'] = i
            continue

        m_var = re.match(r'^;\s*@\s*variant\s+(\S+)(?:\s+(default))?\s*$', stripped)
        if m_var:
            tag = m_var.group(1)
            is_def = bool(m_var.group(2))
            if pending is not None:
                pending['variant_tag'] = tag
                pending['variant_default'] = is_def
                pending['variant_line_idx'] = i
            else:
                pre_variant_tag = tag
                pre_variant_default = is_def
                pre_variant_line_idx = i
            continue

        m_strict = re.match(r'^;\s*@\s*strict\s+(.+)$', stripped)
        if m_strict:
            try:
                mask = [int(x) for x in m_strict.group(1).split()]
            except ValueError:
                print(f'  ⚠️  bad strict line: {stripped}')
                mask = None
            if pending is not None:
                pending['strict_mask'] = mask
                pending['strict_line_idx'] = i
            else:
                pre_strict_mask = mask
                pre_strict_line_idx = i
            continue

        m_op = re.match(r'^\s*opcode\s+(\w+)\s*,', stripped)
        if m_op and pending is not None:
            pending['opcode_name'] = m_op.group(1)
            pending['opcode_line_idx'] = i
            blocks.append(pending)
            pending = None
            continue

    return blocks


# ─────────────────────────────────────────────────────────────
#  Утилиты
# ─────────────────────────────────────────────────────────────

def infer_suffix(ins, outs, variant_idx):
    """
    Логика:
      - все 'k' → 'k'
      - все 'a' → 'a'
      - смешанные или пустые → по индексу: 0 → 'k', 1 → 'a'
    """
    if not ins:
        return (('k' if variant_idx == 0 else 'a'), 'empty')
    has_a = any(t == 'a' for t in ins)
    has_k = any(t == 'k' for t in ins)
    if not has_a:
        return ('k', 'ok')
    if not has_k:
        return ('a', 'ok')
    return (('k' if variant_idx == 0 else 'a'), 'mixed')


def compute_strict_mask(blocks):
    """1 если ins[i] одинаков у всех вариантов, иначе 0."""
    if not blocks:
        return []
    ins_list = [b['ins'] for b in blocks]
    n = len(ins_list[0])
    mask = []
    for i in range(n):
        types_at_i = set(ins[i] for ins in ins_list if i < len(ins))
        mask.append(1 if len(types_at_i) == 1 else 0)
    return mask


def has_suffix(opcode_name: str) -> bool:
    return opcode_name.endswith('_k') or opcode_name.endswith('_a')


def strict_already_manual(mask) -> bool:
    return bool(mask) and any(v == 1 for v in mask)


# ─────────────────────────────────────────────────────────────
#  Обработка файла
# ─────────────────────────────────────────────────────────────

def process_file(path: Path, dry_run: bool, backup: bool):
    text = path.read_text(encoding='utf-8')
    blocks = parse_blocks(text)

    if len(blocks) < 2:
        print(f'  ⏭ {path.name}: одиночный вариант — пропущено')
        return 'skipped'

    if len(blocks) > 2:
        print(f'  ⚠️  {path.name}: {len(blocks)} вариантов — ручная разметка, пропущено')
        return 'warn'

    # Суффиксы
    suffixes = []
    for idx, b in enumerate(blocks):
        s, status = infer_suffix(b['ins'], b['outs'] or [], idx)
        if b['variant_tag']:
            s = b['variant_tag']
            status = 'explicit'
        suffixes.append(s)
        if status == 'mixed':
            print(f'  ⚠️  {path.name}: смешанные ins для блока {idx}, суффикс "{s}"')
        elif status == 'empty':
            print(f'  ⚠️  {path.name}: пустые ins/outs для блока {idx}, суффикс "{s}"')

    if len(set(suffixes)) != len(suffixes):
        print(f'  ⚠️  {path.name}: дублирующиеся суффиксы {suffixes} — пропущено')
        return 'warn'

    computed_strict = compute_strict_mask(blocks)

    existing_strict_manual = any(
        strict_already_manual(b['strict_mask']) for b in blocks
    )

    # ⭐ default — всегда у ПЕРВОГО. Проверим, где он сейчас.
    default_idx = None
    for idx, b in enumerate(blocks):
        if b['variant_default']:
            default_idx = idx
            break

    lines = text.split('\n')
    inserts = []

    for idx, b in enumerate(blocks):
        suffix = suffixes[idx]

        # === 1. variant ===
        # default ставим только первому блоку
        want_default = (idx == 0)
        variant_value = suffix + (' default' if want_default else '')
        new_variant_line = f';@ variant {variant_value}'

        if b['variant_line_idx'] is not None:
            old_line = lines[b['variant_line_idx']].strip()
            if old_line != new_variant_line:
                inserts.append(('replace', b['variant_line_idx'], [new_variant_line]))
        else:
            inserts.append(('insert_before', b['ins_line_idx'], [new_variant_line]))

        # === 2. strict (только первый блок) ===
        if idx == 0:
            strict_str = ' '.join(str(v) for v in computed_strict)
            strict_line = f';@ strict {strict_str}'

            if b['strict_line_idx'] is None:
                anchor = b['variant_line_idx'] if b['variant_line_idx'] is not None else b['ins_line_idx']
                inserts.append(('insert_before', anchor, [strict_line]))
            elif not existing_strict_manual:
                old_line = lines[b['strict_line_idx']].strip()
                if old_line != strict_line:
                    inserts.append(('replace', b['strict_line_idx'], [strict_line]))

        # === 3. opcode ===
        op_line = lines[b['opcode_line_idx']]
        if has_suffix(b['opcode_name']):
            pass
        else:
            new_op = re.sub(
                rf'^(\s*opcode\s+){re.escape(b["opcode_name"])}(\s*,)',
                rf'\g<1>{b["opcode_name"]}_{suffix}\g<2>',
                op_line,
            )
            inserts.append(('replace', b['opcode_line_idx'], [new_op]))

    # === Применение ===
    replacements = {}
    insert_before = {}
    for kind, li, new_lines in inserts:
        if kind == 'replace':
            replacements[li] = new_lines
        elif kind == 'insert_before':
            insert_before.setdefault(li, []).extend(new_lines)

    result = []
    for i, line in enumerate(lines):
        if i in insert_before:
            result.extend(insert_before[i])
        if i in replacements:
            result.extend(replacements[i])
        else:
            result.append(line)

    new_text = '\n'.join(result)

    if new_text == text:
        print(f'  ✓ {path.name}: без изменений')
        return 'ok'

    # Лог
    print(f'  ✅ {path.name}:')
    for idx, b in enumerate(blocks):
        suffix = suffixes[idx]
        tag = ' (default)' if idx == 0 else ''
        actual_name = b['opcode_name']
        if not has_suffix(actual_name):
            actual_name = f'{actual_name}_{suffix}'
        print(f'       variant {suffix}{tag}: {actual_name}  ins={b["ins"]}')
    if any(computed_strict):
        print(f'       strict: {computed_strict}')

    if not dry_run:
        if backup:
            shutil.copy(path, path.with_suffix(path.suffix + '.bak'))
        path.write_text(new_text, encoding='utf-8')

    return 'ok'


# ─────────────────────────────────────────────────────────────
#  CLI
# ─────────────────────────────────────────────────────────────

def collect_targets(target: Path):
    if target.is_file():
        return [target]
    return sorted(target.glob('*.txt'))


def main():
    ap = argparse.ArgumentParser(description='Патчер вариантов UDO (_k / _a).')
    ap.add_argument('target', help='файл или папка')
    ap.add_argument('--dry', action='store_true', help='без записи')
    ap.add_argument('--no-backup', action='store_true', help='не создавать .bak')
    args = ap.parse_args()

    target = Path(args.target)
    if not target.exists():
        print(f'❌ {target} не найден')
        sys.exit(1)

    files = [f for f in collect_targets(target) if not f.name.endswith('.bak')]

    print(f'📂 Цель: {target}')
    print(f'📄 Файлов: {len(files)}')
    print(f'⚙️  Режим: {"DRY-RUN (без записи)" if args.dry else "ЗАПИСЬ"}')
    print('─' * 60)

    stats = {'ok': 0, 'skipped': 0, 'warn': 0}
    for f in files:
        r = process_file(f, dry_run=args.dry, backup=not args.no_backup)
        stats[r] = stats.get(r, 0) + 1

    print('─' * 60)
    print(f'✅ обработано: {stats["ok"]}, ⏭ пропущено: {stats["skipped"]}, ⚠️ проблем: {stats["warn"]}')


if __name__ == '__main__':
    main()