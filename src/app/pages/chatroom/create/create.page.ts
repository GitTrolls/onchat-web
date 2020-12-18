import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CHATROOM_DESCRIPTION_MAX_LENGTH, CHATROOM_DESCRIPTION_MIN_LENGTH, CHATROOM_NAME_MAX_LENGTH, CHATROOM_NAME_MIN_LENGTH } from 'src/app/common/constant';
import { Chatroom } from 'src/app/models/form.model';
import { ChatItem, Result } from 'src/app/models/onchat.model';
import { GlobalDataService } from 'src/app/services/global-data.service';
import { OnChatService } from 'src/app/services/onchat.service';
import { OverlayService } from 'src/app/services/overlay.service';

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
  originPrivateChatrooms: (ChatItem & { checked: boolean })[] = [];
  /** 分页页码 */
  privateChatroomsPage: number = 1;
  /** 搜索关键字 */
  keyword: string = '';

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
    private overlayService: OverlayService,
    public globalDataService: GlobalDataService,
  ) { }

  ngOnInit() {
    const push = (privateChatrooms: ChatItem[]) => {
      for (const item of privateChatrooms) {
        this.originPrivateChatrooms.push({ ...item, checked: false });
      }
    }

    if (this.globalDataService.privateChatrooms.length) {
      push(this.globalDataService.privateChatrooms);
    } else {
      this.onChatService.getPrivateChatrooms().subscribe((result: Result<ChatItem[]>) => {
        if (result.code !== 0) { return; }

        this.globalDataService.privateChatrooms = result.data;
        push(result.data);
      });
    }
  }

  submit() {
    if (this.loading) { return; }
    this.loading = true;

    // 得到邀请的好友的聊天室ID
    const chatroomIdList = this.originPrivateChatrooms.filter(o => o.checked).map(o => o.chatroomId);

    console.log(chatroomIdList);

    const { name, description } = this.chatroomForm.value;

    this.onChatService.createChatroom(new Chatroom(name.trim(), description.trim())).subscribe((result: Result<ChatItem>) => {
      this.loading = false;

      if (result.code !== 0) {
        return this.overlayService.presentToast('聊天室创建失败！');
      }

      this.globalDataService.chatList.push(result.data);
      this.globalDataService.chatList = this.globalDataService.chatList;

      this.overlayService.presentToast('聊天室创建成功！');
      // TODO 跳到群简介页面
      this.router.navigateByUrl('/');
    });
  }

  /**
   * 已选群成员人数
   */
  peopleNum() {
    let num = 1;
    for (const item of this.originPrivateChatrooms) {
      item.checked && num++;
    }
    return num;
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
  deleteMember(item: ChatItem & { checked: boolean }) {
    item.checked = false;
  }

  /**
   * 私聊聊天室列表
   */
  privateChatrooms() {
    let { originPrivateChatrooms, keyword } = this;
    if (keyword.length) {
      originPrivateChatrooms = originPrivateChatrooms.filter(o => o.name.indexOf(keyword) >= 0);
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
