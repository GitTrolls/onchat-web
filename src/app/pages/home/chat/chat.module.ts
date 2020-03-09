import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { NumLimitPipe } from 'src/app/pipes/num-limit.pipe';
import { ChatPageRoutingModule } from './chat-routing.module';
import { ChatPage } from './chat.page';




@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatPageRoutingModule
  ],
  declarations: [ChatPage, NumLimitPipe]
})
export class ChatPageModule { }
