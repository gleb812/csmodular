// editor/ui/Toast.js
//
// Простые тосты в правом нижнем углу.
// Заменяет заглушку uiManager.showNotification в EditorApp.

export function showNotification(message, duration = 2000) {
    const old = document.querySelectorAll('.editor-notification');
    old.forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.className = 'editor-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 14px;
        background: rgba(0, 170, 255, 0.9);
        color: white;
        border-radius: 4px;
        z-index: 2000;
        font-family: Arial, sans-serif;
        font-size: 12px;
        max-width: 300px;
        animation: editorFadeInOut ${duration}ms ease;
    `;

    if (!document.querySelector('#editor-notification-animation')) {
        const style = document.createElement('style');
        style.id = 'editor-notification-animation';
        style.textContent = `
            @keyframes editorFadeInOut {
                0%   { opacity: 0; transform: translateY(10px); }
                10%  { opacity: 1; transform: translateY(0); }
                90%  { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(10px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) notification.parentNode.removeChild(notification);
    }, duration);
}