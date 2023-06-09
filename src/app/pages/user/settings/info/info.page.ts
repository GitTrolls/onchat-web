import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { NavController } from '@ionic/angular';
import { finalize, takeUntil } from 'rxjs/operators';
import { Gender, Mood } from 'src/app/common/enums';
import { ValidationFeedback } from 'src/app/common/interfaces';
import { AvatarCropperComponent, AvatarData } from 'src/app/components/modals/avatar-cropper/avatar-cropper.component';
import { NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH, SIGNATURE_MAX_LENGTH, SIGNATURE_MIN_LENGTH, USERNAME_MAX_LENGTH } from 'src/app/constants';
import { UserInfo } from 'src/app/models/form.model';
import { Result } from 'src/app/models/onchat.model';
import { UserService } from 'src/app/services/apis/user.service';
import { Destroyer } from 'src/app/services/destroyer.service';
import { GlobalData } from 'src/app/services/global-data.service';
import { Overlay } from 'src/app/services/overlay.service';
import { StrUtils } from 'src/app/utilities/str.utils';
import { SysUtils } from 'src/app/utilities/sys.utils';

@Component({
  selector: 'app-settings',
  templateUrl: './info.page.html',
  styleUrls: ['./info.page.scss'],
  providers: [Destroyer]
})
export class InfoPage implements OnInit {
  /** 昵称最大长度 */
  readonly nicknameMaxLength: number = USERNAME_MAX_LENGTH;
  /** 个性签名最大长度 */
  readonly signatureMaxLength: number = SIGNATURE_MAX_LENGTH;
  /** 性别枚举 */
  readonly gender: typeof Gender = Gender;
  /** 初始时间 */
  min: string = new Date(new Date().getFullYear() - 100, 0, 2).toISOString();
  /** 今天的ISO时间 */
  today: string = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  /** 用户信息表单提交数据体 */
  userInfo: UserInfo = new UserInfo;
  /** 数据是否肮脏？ */
  dirty: boolean = false;
  /** 加载中 */
  loading: boolean = false;
  showMask: boolean;

  form: FormGroup = this.formBuilder.group({
    nickname: [
      '', [
        Validators.required,
        Validators.minLength(NICKNAME_MIN_LENGTH),
        Validators.maxLength(NICKNAME_MAX_LENGTH)
      ]
    ],
    signature: [
      null, [
        Validators.minLength(SIGNATURE_MIN_LENGTH),
        Validators.maxLength(SIGNATURE_MAX_LENGTH)
      ]
    ],
    mood: [
      null, [
        Validators.required
      ]
    ],
    birthday: [
      null, [
        Validators.required
      ]
    ],
    gender: [
      null, [
        Validators.required
      ]
    ]
  });

  readonly nicknameFeedback: ValidationFeedback = (errors: ValidationErrors) => {
    if (!errors) { return; }
    if (errors.required) {
      return '昵称不能为空！';
    }
    if (errors.minlength || errors.maxlength) {
      return `昵称长度必须在${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}位字符之间！`;
    }
  }
  readonly signatureFeedback: ValidationFeedback = (errors: ValidationErrors) => {
    if (!errors) { return; }
    if (errors.minlength || errors.maxlength) {
      return `个性签名长度必须在${SIGNATURE_MIN_LENGTH}~${SIGNATURE_MAX_LENGTH}位字符之间！`;
    }
  }

  constructor(
    public globalData: GlobalData,
    private overlay: Overlay,
    private navCtrl: NavController,
    private formBuilder: FormBuilder,
    private userService: UserService,
    private destroyer: Destroyer,
  ) { }

  ngOnInit() {
    const { user } = this.globalData;

    this.form.setValue({
      nickname: user.nickname,
      signature: user.signature,
      mood: user.mood ?? Mood.Joy,
      birthday: user.birthday ? new Date(user.birthday).toISOString() : this.today,
      gender: user.gender ?? Gender.Secret
    });

    this.form.valueChanges.pipe(takeUntil(this.destroyer)).subscribe(() => {
      this.dirty = true;
    });
  }

  /**
   * 消除表单控件的值的空格
   * @param controlName 控件名
   */
  trimAll(controlName: string) {
    const value = StrUtils.trimAll(this.form.get(controlName).value);
    this.form.controls[controlName].setValue(value);
  }

  /**
   * 提交
   */
  submit() {
    if (this.loading) { return; }
    this.loading = true;

    const { nickname, signature, mood, birthday, gender } = this.form.value;

    this.userInfo.nickname = nickname;
    this.userInfo.signature = signature ? signature.trim() : null;
    this.userInfo.mood = mood;
    this.userInfo.birthday = Date.parse(birthday);
    this.userInfo.gender = +gender;

    this.userService.saveUserInfo(this.userInfo).pipe(
      finalize(() => this.loading = false)
    ).subscribe(({ data }: Result<UserInfo>) => {
      const { user } = this.globalData;

      this.globalData.user = { ...user, ...data };

      this.overlay.toast('用户信息修改成功！', 1000).then(() => {
        this.navCtrl.back();
      });
    });
  }

  presentActionSheet() {
    const buttons = [
      {
        text: '更换头像',
        handler: () => {
          SysUtils.selectFile('image/*').subscribe((event: Event) => this.overlay.modal({
            component: AvatarCropperComponent,
            componentProps: {
              imageChangedEvent: event,
              uploader: (avatar: File) => this.userService.avatar(avatar),
              handler: ({ data }: Result<AvatarData>) => {
                const { avatar, avatarThumbnail } = data;
                this.globalData.user.avatar = avatar;
                this.globalData.user.avatarThumbnail = avatarThumbnail;
              }
            }
          }));
        }
      },
      { text: '更换背景图' },
      { text: '取消', role: 'cancel' }
    ];

    this.overlay.actionSheet(buttons);
  }

  // TODO ionic v6 has CustomEvent
  onScroll(event: Event) {
    this.showMask = (event as CustomEvent<HTMLIonContentElement>).detail.scrollTop > 125;
  }

}
