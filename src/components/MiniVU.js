// components/MiniVU.js
import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class MiniVU extends BaseComponent {
    constructor(x, y, width = 200, height = 150) {
        super(x, y, width, height);
    }
    
    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;

        if (isLcd) {
            // LCD: прозрачный фон + рамка
            ctx.fillStyle = theme.getAccentAlpha(0.05);
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = theme.getAccentColor();
            ctx.lineWidth = theme.lineWidth(1);
            theme.applyGlow(ctx);
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            theme.clearGlow(ctx);
        } else {
            // Classic: как было
            ctx.fillStyle = '#111';
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}