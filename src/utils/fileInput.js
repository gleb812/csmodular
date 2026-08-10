export function createFileInput(accept = '.json,.pch2') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.name = 'patch-file-input';
    
    // Стандартные стили для работы
    input.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0.001 !important;
        visibility: visible !important;
        display: block !important;
        z-index: 999999 !important;
    `;
    
    return input;
}

export function triggerFileInput(input, callback) {
    // Добавляем в DOM
    document.body.appendChild(input);
    
    // Обработчик
    const handleChange = (e) => {
        const file = e.target.files[0];
        
        // Убираем обработчик
        input.removeEventListener('change', handleChange);
        
        // Вызываем callback
        if (file && callback) {
            callback(file);
        }
        
        // Удаляем input
        setTimeout(() => {
            if (input.parentNode) {
                input.parentNode.removeChild(input);
            }
        }, 100);
    };
    
    input.addEventListener('change', handleChange);
    
    // Кликаем с задержкой
    setTimeout(() => {
        input.click();
    }, 50);
}