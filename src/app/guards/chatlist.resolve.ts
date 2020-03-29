import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { environment as env } from '../../environments/environment';
import { ChatItem } from '../models/entity.model';
import { Result } from '../models/result.model';
import { sortChatList } from '../pages/home/chat/chat.page';
import { LocalStorageService } from '../services/local-storage.service';
import { OnChatService } from '../services/onchat.service';

@Injectable({
    providedIn: 'root',
})
export class ChatListResolve implements Resolve<ChatItem[]> {
    constructor(private onChatService: OnChatService, private localStorageService: LocalStorageService, ) { }

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): ChatItem[] {
        const data = this.localStorageService.get(env.chatListKey);
        if (data) { return data; }

        this.onChatService.getChatList().subscribe((chatList: Result<ChatItem[]>) => {
            const data = sortChatList(chatList.data)
            this.localStorageService.set(env.chatListKey, data);
            return data;
        });
    }
}