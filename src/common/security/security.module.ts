import { Module, Global } from '@nestjs/common';
import { CsrfService } from './services/csrf.service';
import { SessionService } from './services/session.service';
import { CookieService } from './services/cookie.service';
import { SecurityEventService } from './services/security-event.service';
import { CsrfGuard } from './guards/csrf.guard';
import { SessionGuard } from './guards/session.guard';

@Global()
@Module({
    providers: [
        CsrfService,
        SessionService,
        CookieService,
        SecurityEventService,
        CsrfGuard,
        SessionGuard,
    ],
    exports: [
        CsrfService,
        SessionService,
        CookieService,
        SecurityEventService,
        CsrfGuard,
        SessionGuard,
    ],
})
export class SecurityModule {}
