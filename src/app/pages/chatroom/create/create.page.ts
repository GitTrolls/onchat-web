import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CHATROOM_DESCRIPTION_MAX_LENGTH, CHATROOM_DESCRIPTION_MIN_LENGTH, CHATROOM_NAME_MAX_LENGTH, CHATROOM_NAME_MIN_LENGTH } from 'src/app/common/constant';
import { ResultCode, SocketEvent } from 'src/app/common/enum';
import { ChatSession, Result } from 'src/app/models/onchat.model';
import { GlobalDataService } from 'src/app/services/global-data.service';
import { OnChatService } from 'src/app/services/onchat.service';
import { OverlayService } from 'src/app/services/overlay.service';
import { SocketService } from 'src/app/services/socket.service';

const CHAT_ITEM_ROWS: number = 10;

@Component({
  selector: 'app-create',
  templateUrl: './create.page.html',
  styleUrls: ['./create.page.scss'],
})
export class CreatePage implements OnInit {
  /** 群名最大长度 */
  nameMaxLength: number = CHATROOM_NAME_MAX_LENGTH;
  /** 群简介最大长度 */
  descriptionMaxLength: number = CHATROOM_DESCRIPTION_MAX_LENGTH;
  /** 加载中 */
  loading: boolean = false;
  /** 原始私聊聊天室列表 */
  originPrivateChatrooms: (ChatSession & { checked: boolean })[] = [];
  /** 分页页码 */
  privateChatroomsPage: number = 1;
  /** 搜索关键字 */
  keyword: string = '';
  subject: Subject<unknown> = new Subject();

  chatroomForm: FormGroup = this.fb.group({
    name: [
      null, [
        Validators.required,
        Validators.minLength(CHATROOM_NAME_MIN_LENGTH),
        Validators.maxLength(CHATROOM_NAME_MAX_LENGTH)
      ]
    ],
    description: [
      null, [
        Validators.minLength(CHATROOM_DESCRIPTION_MIN_LENGTH),
        Validators.maxLength(CHATROOM_DESCRIPTION_MAX_LENGTH)
      ]
    ]
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private onChatService: OnChatService,
    private socketService: SocketService,
    private overlayService: OverlayService,
    public globalDataService: GlobalDataService,
  ) { }

  ngOnInit() {
    const setOriginPrivateChatrooms = (privateChatrooms: ChatSession[]) => {
      this.originPrivateChatrooms = privateChatrooms.map(o => ({ ...o, checked: false }));
    }

    if (this.globalDataService.privateChatrooms.length) {
      setOriginPrivateChatrooms(this.globalDataService.privateChatrooms);
    } else {
      this.onChatService.getPrivateChatrooms().subscribe((result: Result<ChatSession[]>) => {
        if (result.code !== ResultCode.Success) { return; }

        this.globalDataService.privateChatrooms = result.data;
        setOriginPrivateChatrooms(result.data);
      });
    }

    this.socketService.on(SocketEvent.CreateChatroom).pipe(takeUntil(this.subject)).subscribe((result: Result<ChatSession>) => {
      this.loading = false;

      if (result.code !== ResultCode.Success) {
        return this.overlayService.presentToast('聊天室创建失败，原因：' + result.msg);
      }

      this.globalDataService.chatSessions.push(result.data);
      this.globalDataService.sortChatSessions();

      this.overlayService.presentToast('聊天室创建成功！');
      // 得到邀请的好友的聊天室ID
      const chatroomIdList = this.originPrivateChatrooms.filter(o => o.checked).map(o => o.data.chatroomId);
      this.socketService.inviteJoinChatroom(result.data.data.chatroomId, chatroomIdList);

      // TODO 跳到群简介页面
      this.router.navigateByUrl('/');
    });
  }

  ngOnDestroy() {
    this.subject.next();
    this.subject.complete();
  }

  submit() {
    if (this.loading) { return; }
    this.loading = true;

    const { name, description } = this.chatroomForm.value;
    this.socketService.createChatroom(name.trim(), description ? description.trim() : null);
  }

  /**
   * 已选群成员人数
   */
  peopleNum() {
    return this.originPrivateChatrooms.reduce((num, o) => o.checked ? ++num : num, 1);
  }

  /**
   * 搜索框变化时
   */
  search() {
    this.privateChatroomsPage = 1;
  }

  /**
   * 删除已选群成员
   * @param item
   */
  deleteMember(item: ChatSession & { checked: boolean }) {
    item.checked = false;
  }

  /**
   * 私聊聊天室列表
   */
  privateChatrooms() {
    let { originPrivateChatrooms, keyword } = this;
    if (keyword.length) {
      originPrivateChatrooms = originPrivateChatrooms.filter(o => o.title.indexOf(keyword) >= 0);
    }
    return this.privateChatroomsPage ? originPrivateChatrooms.slice(0, this.privateChatroomsPage * CHAT_ITEM_ROWS) : originPrivateChatrooms;
  }

  /**
   * 加载更多
   * @param event
   */
  loadData(event: any) {
    if (!this.privateChatroomsPage) {
      return event.target.complete();
    }

    if (++this.privateChatroomsPage * CHAT_ITEM_ROWS >= this.globalDataService.privateChatrooms.length) {
      this.privateChatroomsPage = null;
    }

    event.target.complete();
  }

  nameFeedback(errors: ValidationErrors) {
    if (errors.required) {
      return '聊天室名称不能为空！';
    } else if (errors.minlength || errors.maxlength) {
      return `聊天室名称长度必须在${CHATROOM_NAME_MIN_LENGTH}~${CHATROOM_NAME_MAX_LENGTH}位字符之间！`;
    }
  }

  descriptionFeedback(errors: ValidationErrors) {
    if (errors.minlength || errors.maxlength) {
      return `聊天室简介长度必须在${CHATROOM_DESCRIPTION_MIN_LENGTH}~${CHATROOM_DESCRIPTION_MAX_LENGTH}位字符之间！`;
    }
  }
}
