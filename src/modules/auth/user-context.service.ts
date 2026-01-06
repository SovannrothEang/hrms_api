import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface UserContext {
    id: string;
    email: string;
    roles: string[];
}

@Injectable()
export class UserContextService {
    private readonly als = new AsyncLocalStorage<UserContext>();

    run(store: UserContext, callback: () => void) {
        this.als.run(store, callback);
    }

    getUserContext() {
        return this.als.getStore();
    }

    setUser(user: UserContext) {
        const store = this.als.getStore();
        if (store) {
            Object.assign(store, user);
        }
    }
}
