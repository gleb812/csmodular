#!/usr/bin/env python3
"""
patch_params.py — добавляет/обновляет params в JS-описаниях модулей.

MODE-компоненты (PartSelector, LevelShift) — детектируются, но НЕ пишутся
в params. Для них выводится warning — их надо вручную добавить в `mode: [...]`.

Использование:
    python patch_params.py modules/                # вся папка
    python patch_params.py modules/Out2.js         # один файл
    python patch_params.py modules/ --dry          # без записи
    python patch_params.py modules/ --no-backup    # без .bak
"""

import argparse
import json
import re
import shutil
import sys
import ast
from pathlib import Path


PARAM_TYPES = [
    'Knob',
    'Slider',
    'ButtonFlat',
    'ButtonText',
    'ButtonRadio',
    'ButtonIncDec',
    'TextEdit',
]

MODE_TYPES = [
    'PartSelector',
    'LevelShift',
]


def _extract_array_body(text: str, start_idx: int) -> str:
    """
    Начиная с позиции `start_idx` (где стоит '['), возвращает подстроку
    до соответствующей закрывающей ']' (учитывая вложенность, строки и escape).
    """
    assert text[start_idx] == '['
    depth = 0
    in_string = False
    quote_char = None
    escape = False
    
    i = start_idx
    while i < len(text):
        ch = text[i]
        
        if in_string:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == quote_char:
                in_string = False
        else:
            if ch in ('"', "'"):
                in_string = True
                quote_char = ch
            elif ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth == 0:
                    return text[start_idx:i+1]
        i += 1
    return None


def extract_components(js_text: str):
    # Ищем "components:" и открывающую "["
    m = re.search(r'components\s*:\s*\[', js_text)
    if not m:
        return None
    
    # Позиция '[' — на один символ назад от конца матча
    bracket_pos = m.end() - 1
    raw = _extract_array_body(js_text, bracket_pos)
    if raw is None:
        print('  ⚠️  Не найдена закрывающая ] для components')
        return None
    
    # Нормализация + парсинг
    raw_norm = _normalize_for_json(raw)
    
    # 1. json.loads
    try:
        return json.loads(raw_norm)
    except json.JSONDecodeError as e:
        # 2. ast.literal_eval с заменой JS-литералов
        try:
            cleaned = re.sub(r'\bundefined\b', 'None', raw_norm)
            cleaned = re.sub(r'\btrue\b', 'True', cleaned)
            cleaned = re.sub(r'\bfalse\b', 'False', cleaned)
            cleaned = re.sub(r'\bnull\b', 'None', cleaned)
            return ast.literal_eval(cleaned)
        except (ValueError, SyntaxError) as e2:
            print(f'  ⚠️  JSON parse error: {e.msg}')
            print(f'      Строка {e.lineno}, колонка {e.colno} (внутри components)')
            lines = raw.split('\n')
            err_line = e.lineno - 1
            for i in range(max(0, err_line - 1), min(len(lines), err_line + 2)):
                marker = '>>>' if i == err_line else '   '
                print(f'      {marker} {i+1:4d}: {lines[i]}')
            return None

def collect_param_ids(components):
    """[id, ...] для PARAM_TYPES в порядке появления."""
    ids = []
    for comp in components:
        if comp.get('componentType') in PARAM_TYPES:
            cid = comp.get('id')
            if cid is not None:
                ids.append(int(cid))
    return ids


def collect_mode_components(components):
    """[(type, id), ...] для MODE_TYPES — только для отчёта."""
    result = []
    for comp in components:
        if comp.get('componentType') in MODE_TYPES:
            result.append((comp['componentType'], comp.get('id')))
    return result


def build_params_line(ids):
    inner = ', '.join(str(i) for i in ids)
    return f'    params: [{inner}],'


def replace_or_insert_params(js_text, ids):
    """
    Возвращает (новый_текст, статус).
    status: 'inserted' | 'replaced' | 'unchanged' | 'error'
    """
    new_line = build_params_line(ids)

    # 1. Если params уже есть — заменяем
    existing = re.search(r'^(\s*params\s*:\s*\[[^\]]*\],?\s*)$', js_text, re.MULTILINE)
    if existing:
        old = existing.group(1).strip()
        new = new_line.strip()
        if old == new:
            return js_text, 'unchanged'
        return js_text[:existing.start()] + new_line + js_text[existing.end():], 'replaced'

    # 2. Иначе — вставляем после tooltip
    m = re.search(r'^(\s*tooltip\s*:\s*[\'"][^\'"]*[\'"],?\s*)$', js_text, re.MULTILINE)
    if m:
        insert_at = m.end()
        return js_text[:insert_at] + '\n' + new_line + js_text[insert_at:], 'inserted'

    # 3. Fallback — после defaultParams
    m = re.search(r'^(\s*defaultParams\s*:\s*\[[^\]]*\],?\s*)$', js_text, re.MULTILINE)
    if m:
        insert_at = m.end()
        return js_text[:insert_at] + '\n' + new_line + js_text[insert_at:], 'inserted'

    return js_text, 'error'


def _normalize_for_json(raw: str) -> str:
    """Снимает trailing commas и комментарии."""
    raw = re.sub(r'//[^\n]*', '', raw)
    raw = re.sub(r'/\*[\s\S]*?\*/', '', raw)
    raw = re.sub(r',\s*([}\]])', r'\1', raw)
    return raw

def patch_file(path: Path, dry_run=False, backup=True):
    text = path.read_text(encoding='utf-8')

    components = extract_components(text)
    if components is None:
        print(f'  ❌ {path.name}: не удалось найти/распарсить components')
        return False

    ids = collect_param_ids(components)
    mode_comps = collect_mode_components(components)

    new_text, status = replace_or_insert_params(text, ids)

    if status == 'error':
        print(f'  ❌ {path.name}: не удалось найти место для вставки')
        return False

    # Лог по params
    params_str = '[' + ', '.join(str(i) for i in ids) + ']'
    if status == 'unchanged':
        print(f'  ✓ {path.name}: params = {params_str} (без изменений)')
    elif status == 'replaced':
        print(f'  ⚠️  {path.name}: params ПЕРЕЗАПИСАН → {params_str}')
    else:
        print(f'  ✅ {path.name}: params добавлен → {params_str}')

    # Лог по MODE-компонентам
    for comp_type, comp_id in mode_comps:
        print(f'      ⚠️  {comp_type} id={comp_id} — MODE-компонент, проверь mode: [...] вручную')

    if not dry_run and status != 'unchanged':
        if backup:
            shutil.copy(path, path.with_suffix(path.suffix + '.bak'))
        path.write_text(new_text, encoding='utf-8')

    return True


def collect_targets(target: Path):
    if target.is_file():
        return [target]
    return sorted(target.glob('*.js'))


def main():
    ap = argparse.ArgumentParser(description='Патчер params для NM2-модулей.')
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

    ok = 0
    for f in files:
        if patch_file(f, dry_run=args.dry, backup=not args.no_backup):
            ok += 1

    print('─' * 60)
    print(f'✅ Обработано: {ok}/{len(files)}')


if __name__ == '__main__':
    main()