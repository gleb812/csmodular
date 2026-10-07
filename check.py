
import re, pathlib
for f in pathlib.Path('csound/modules').glob('*.txt'):
    text = f.read_text(encoding='utf-8', errors='ignore')
    n = len(re.findall(r'^\s*opcode\s+', text, re.M))
    if n > 1:
        print(f'{f.name}: {n} opcodes')
