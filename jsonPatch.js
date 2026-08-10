// apply-patches.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Читаем конфиг
const configPath = path.join(__dirname, 'patch-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('🎯 Начинаю применение патчей...\n');

Object.entries(config.patches).forEach(([moduleName, patches]) => {
    const filePath = path.join(__dirname, 'modules', `${moduleName}.js`);
    
    console.log(`📁 ${moduleName}:`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`   ❌ Файл не найден`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let appliedPatches = 0;
    
    patches.forEach(patch => {
        const { componentType, componentId, changes } = patch;
        
        console.log(`   🔍 Ищу ${componentType} id="${componentId}"...`);
        
        // ШАГ 1: Находим точное положение компонента в файле
        // Ищем паттерн: { ... "componentType": "TextField", ... "id": "X" ... }
        const componentPattern = new RegExp(
            `\\{\\s*"componentType":\\s*"${componentType}"[^}]*"id":\\s*"${componentId}"[^}]*\\}`,
            'g'
        );
        
        const matches = content.match(componentPattern);
        
        if (!matches || matches.length === 0) {
            console.log(`   ⚠️ Не найден`);
            return;
        }
        
        matches.forEach(originalMatch => {
            let updatedMatch = originalMatch;
            let changed = false;
            
            // ШАГ 2: Применяем каждое изменение
            Object.entries(changes).forEach(([field, value]) => {
                // Ищем поле в компоненте
                const fieldPattern = new RegExp(`"${field}":\\s*([^,\\s\\}]+)`);
                const fieldMatch = updatedMatch.match(fieldPattern);
                
                if (fieldMatch) {
                    // Поле существует - заменяем значение
                    const oldValue = fieldMatch[1];
                    updatedMatch = updatedMatch.replace(
                        fieldPattern,
                        `"${field}": ${JSON.stringify(value)}`
                    );
                    console.log(`      ✅ ${field}: ${oldValue} → ${value}`);
                } else {
                    // Поле не существует - добавляем перед закрывающей скобкой
                    const lastBraceIndex = updatedMatch.lastIndexOf('}');
                    const beforeBrace = updatedMatch.slice(0, lastBraceIndex);
                    const afterBrace = updatedMatch.slice(lastBraceIndex);
                    
                    // Добавляем запяту если нужно
                    let insertionPoint = beforeBrace.trim();
                    if (!insertionPoint.endsWith(',')) {
                        insertionPoint += ',';
                    }
                    
                    updatedMatch = insertionPoint + 
                                  `\n                "${field}": ${JSON.stringify(value)}` + 
                                  afterBrace;
                    console.log(`      ✅ ${field}: добавлено ${value}`);
                }
                changed = true;
            });
            
            // ШАГ 3: Заменяем в основном контенте
            if (changed) {
                content = content.replace(originalMatch, updatedMatch);
                appliedPatches++;
            }
        });
    });
    
    // ШАГ 4: Сохраняем файл если были изменения
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`   ✅ Исправлено ${appliedPatches} компонента(ов)`);
    } else {
        console.log(`   ℹ️ Изменений не требуется`);
    }
    console.log('');
});

console.log('🎉 Патчинг завершен!');