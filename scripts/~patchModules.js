
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULES_DIR = path.join(__dirname, '../modules');
const PATCH_CONFIG = './patchConfig.json';

function readPatchConfig() {
    const configPath = path.join(__dirname, PATCH_CONFIG);
    const configText = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configText);
}

function patchAllModules() {
    console.log('🔧 Начинаю патчинг модулей...\n');
    
    const patchConfig = readPatchConfig();
    
    fs.readdirSync(MODULES_DIR).forEach(file => {
        if (!file.endsWith('.js')) return;
        
        const filePath = path.join(MODULES_DIR, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Получаем имя модуля из displayName
        const moduleNameMatch = content.match(/displayName\s*:\s*["']([^"']+)["']/);
        if (!moduleNameMatch) return;
        
        const moduleName = moduleNameMatch[1];
        const modulePatches = patchConfig[moduleName];
        
        if (!modulePatches || modulePatches.length === 0) {
            console.log(`➡️  ${moduleName}: нет патчей`);
            return;
        }
        
        console.log(`🔧 ${moduleName}: применяю ${modulePatches.length} патчей`);
        
        // Создаем backup
        const backupPath = `${filePath}.bak`;
        fs.writeFileSync(backupPath, content);
        console.log(`  📋 Создан backup`);
        
        let modified = false;
        let patchedContent = content;
        
        // Применяем патчи
        modulePatches.forEach(patch => {
            // Патч для поля верхнего уровня
            if (patch.field && patch.value !== undefined) {
                const fieldRegex = new RegExp(
                    `(${patch.field}\\s*:\\s*)([^,\\n]+)(,?)`, 
                    'g'
                );
                
                patchedContent = patchedContent.replace(fieldRegex, (match, prefix, oldValue, comma) => {
                    modified = true;
                    console.log(`  ✏️  ${patch.field}: ${oldValue.trim()} → ${patch.value}`);
                    
                    // Сохраняем формат значения
                    let newValue = patch.value;
                    if (typeof patch.value === 'string' && !patch.value.startsWith('"') && !patch.value.startsWith("'")) {
                        if (oldValue.trim().match(/^["'].*["']$/)) {
                            newValue = `"${patch.value}"`;
                        }
                    }
                    
                    return `${prefix}${newValue}${comma}`;
                });
            }
            
            // Патч для svgSrc (НОВЫЙ КОД!)
            if (patch.id && patch.svgSrc) {
                console.log(`  🔍 Ищу компонент с id: ${patch.id} для добавления svgSrc`);
                
                // Ищем компонент с нужным id внутри секции components
                const componentRegex = new RegExp(
                    `(\\{\\s*"componentType"[\\s\\S]*?"id"\\s*:\\s*"${patch.id}"[\\s\\S]*?\\})`,
                    'g'
                );
                
                patchedContent = patchedContent.replace(componentRegex, (match) => {
                    // Проверяем, есть ли уже svgSrc
                    if (!match.includes('"svgSrc"')) {
                        // Находим последнее поле перед закрывающей скобкой
                        const lastBraceIndex = match.lastIndexOf('}');
                        const beforeBrace = match.substring(0, lastBraceIndex);
                        const afterBrace = match.substring(lastBraceIndex);
                        
                        // Определяем отступ из последней строки
                        const lines = match.split('\n');
                        const lastLine = lines[lines.length - 1];
                        const indent = lastLine.match(/^(\s+)/)?.[1] || '                ';
                        
                        // Добавляем svgSrc
                        const newField = `,\n${indent}"svgSrc": "${patch.svgSrc}"`;
                        const newComponent = beforeBrace + newField + afterBrace;
                        
                        modified = true;
                        console.log(`  ✅ Добавлен svgSrc: ${patch.svgSrc} для компонента id: ${patch.id}`);
                        
                        return newComponent;
                    } else {
                        console.log(`  ℹ️  svgSrc уже есть для компонента id: ${patch.id}, пропускаю`);
                        return match;
                    }
                });
            }
            
            // Патч для замены компонента
            if (patch.action === 'replace' && patch.id && patch.newComponent) {
                const componentRegex = new RegExp(
                    `(\\{\\s*"componentType"[\\s\\S]*?"id"\\s*:\\s*"${patch.id}"[\\s\\S]*?\\})`,
                    'g'
                );
                
                patchedContent = patchedContent.replace(componentRegex, () => {
                    modified = true;
                    console.log(`  🔄 Замена компонента id: ${patch.id}`);
                    
                    const newComp = patch.newComponent;
                    const indent = '                ';
                    
                    // Формируем новый компонент
                    const lines = [];
                    lines.push('        {');
                    lines.push(`${indent}"componentType": "${newComp.componentType}",`);
                    lines.push(`${indent}"id": "${newComp.id}",`);
                    lines.push(`${indent}"x": ${newComp.x},`);
                    lines.push(`${indent}"y": ${newComp.y},`);
                    
                    if (newComp.fontSize !== undefined) {
                        lines.push(`${indent}"fontSize": ${newComp.fontSize},`);
                    }
                    
                    if (newComp.color) {
                        lines.push(`${indent}"color": "${newComp.color}",`);
                    }
                    
                    if (newComp.text) {
                        lines.push(`${indent}"text": "${newComp.text}"`);
                    } else {
                        // Убираем последнюю запятую
                        const lastLine = lines[lines.length - 1];
                        lines[lines.length - 1] = lastLine.replace(/,$/, '');
                    }
                    
                    lines.push('        }');
                    
                    return lines.join('\n');
                });
            }
        });
        
        if (!modified) {
            console.log(`  ℹ️  Изменений не было, удаляю backup`);
            fs.unlinkSync(backupPath);
        } else {
            fs.writeFileSync(filePath, patchedContent);
            console.log(`  ✅ Успешно обновлен`);
        }
    });
    
    console.log('\n🎉 Все модули обработаны!');
}

patchAllModules();