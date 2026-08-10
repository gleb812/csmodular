// src/ui/ColorPickerStyles.js
export const ColorPickerStyles = `
    .color-picker {
        background: #2a2a2a;
        border-radius: 4px;
        padding: 4px;
    }
    
    .color-cell {
        transition: all 0.1s ease;
        border: 2px solid transparent;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    
    .color-cell:hover {
        transform: scale(1.15);
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        z-index: 2;
    }
    
    .color-check {
        animation: popIn 0.1s ease;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    
    @keyframes popIn {
        0% { transform: translate(-50%, -50%) scale(0); }
        80% { transform: translate(-50%, -50%) scale(1.2); }
        100% { transform: translate(-50%, -50%) scale(1); }
    }
    
    .color-reset {
        transition: all 0.1s;
        font-size: 10px;
    }
    
    .color-reset:hover {
        background: #3a3a3a !important;
        border-color: #0af !important;
        color: white !important;
    }
`;

// Функция для инжекта
export function injectColorPickerStyles() {
    if (document.getElementById('color-picker-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'color-picker-styles';
    style.textContent = ColorPickerStyles;
    document.head.appendChild(style);
}