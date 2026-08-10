// ModuleSelector.js - упрощенная функция
export function createModuleSelector(addNewModule, showNotification) {
    const container = document.createElement('div');
    container.innerHTML = `
        <div>Добавить модуль:</div>
        <input type="text" placeholder="lfoA, env*, etc.">
        <div class="hint"></div>
        <div>
            <button class="add-va">➕ VA</button>
            <button class="add-fx">🔊 FX</button>
        </div>
    `;
    
    const input = container.querySelector('input');
    const hint = container.querySelector('.hint');
    
    // Кнопки
    container.querySelector('.add-va').onclick = () => {
        if (input.value.trim()) {
            addNewModule(input.value.trim(), 'voice');
            input.value = '';
            hint.textContent = '';
        }
    };
    
    container.querySelector('.add-fx').onclick = () => {
        if (input.value.trim()) {
            addNewModule(input.value.trim(), 'fx');
            input.value = '';
            hint.textContent = '';
        }
    };
    
    // Enter для Voice
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            container.querySelector('.add-va').click();
        }
    });
    
    return container;
}