import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ModalController, NavController, NavParams } from 'ionic-angular';
import * as _ from 'lodash';

// providers
import { ActionSheetProvider } from '../../../providers/action-sheet/action-sheet';
import { DerivationPathHelperProvider } from '../../../providers/derivation-path-helper/derivation-path-helper';
import { ExternalLinkProvider } from '../../../providers/external-link/external-link';
import { KeyProvider } from '../../../providers/key/key';
import { Logger } from '../../../providers/logger/logger';
import { ProfileProvider } from '../../../providers/profile/profile';
import { WalletProvider } from '../../../providers/wallet/wallet';

// pages
import { AddPage } from '../../add/add';
import { BackupKeyPage } from '../../backup/backup-key/backup-key';
import { WalletGroupNamePage } from '../wallet-group-settings/wallet-group-name/wallet-group-name';
import { WalletGroupOnboardingPage } from '../wallet-group-settings/wallet-group-onboarding/wallet-group-onboarding';
import { WalletSettingsPage } from '../wallet-settings/wallet-settings';
import { WalletExportPage } from '../wallet-settings/wallet-settings-advanced/wallet-export/wallet-export';
import { WalletGroupDeletePage } from './wallet-group-delete/wallet-group-delete';
import { WalletGroupExtendedPrivateKeyPage } from './wallet-group-extended-private-key/wallet-group-extended-private-key';

@Component({
  selector: 'page-wallet-group-settings',
  templateUrl: 'wallet-group-settings.html'
})
export class WalletGroupSettingsPage {
  public encryptEnabled: boolean;
  public touchIdEnabled: boolean;
  public touchIdPrevValue: boolean;
  public touchIdAvailable: boolean;
  public deleted: boolean = false;
  public noFromWalletGroup: boolean;
  public walletsGroup;
  public wallets;
  public canSign: boolean;
  public needsBackup: boolean;
  public showReorder: boolean;

  private keyId: string;

  constructor(
    private profileProvider: ProfileProvider,
    private logger: Logger,
    private walletProvider: WalletProvider,
    private actionSheetProvider: ActionSheetProvider,
    private navCtrl: NavController,
    private navParams: NavParams,
    private externalLinkProvider: ExternalLinkProvider,
    private translate: TranslateService,
    private keyProvider: KeyProvider,
    private derivationPathHelperProvider: DerivationPathHelperProvider,
    private modalCtrl: ModalController
  ) {
    this.logger.info('Loaded:  WalletGroupSettingsPage');
    this.keyId = this.navParams.data.keyId;
    this.showReorder = false;
  }

  ionViewWillEnter() {
    this.walletsGroup = this.profileProvider.getWalletGroup(this.keyId);
    this.wallets = this.profileProvider.getWalletsFromGroup({
      keyId: this.keyId,
      showHidden: true
    });
    this.canSign = this.walletsGroup.canSign;
    this.needsBackup = this.walletsGroup.needsBackup;
    this.encryptEnabled = this.walletsGroup.isPrivKeyEncrypted;
  }

  public touchIdChange(): void {
    if (this.touchIdPrevValue == this.touchIdEnabled) return;
    const newStatus = this.touchIdEnabled;
    this.walletProvider
      .setTouchId(this.wallets, newStatus)
      .then(() => {
        this.touchIdPrevValue = this.touchIdEnabled;
        this.logger.debug('Touch Id status changed: ' + newStatus);
      })
      .catch(err => {
        this.logger.error('Error with fingerprint:', err);
        this.touchIdEnabled = this.touchIdPrevValue;
      });
  }

  public encryptChange(): void {
    const val = this.encryptEnabled;

    this.profileProvider.removeProfileLegacy();

    if (val && !this.walletsGroup.isPrivKeyEncrypted) {
      this.logger.debug('Encrypting private key for', this.walletsGroup.name);
      this.keyProvider
        .encrypt(this.keyId)
        .then(() => {
          const key = this.keyProvider.getKey(this.keyId);
          this.keyProvider.addKey(key);
          this.profileProvider.walletsGroups[
            this.keyId
          ].isPrivKeyEncrypted = true;
          this.logger.debug('Key encrypted');
        })
        .catch(err => {
          this.encryptEnabled = false;
          const title = this.translate.instant('Could not encrypt wallet');
          this.showErrorInfoSheet(err, title);
        });
    } else if (!val && this.walletsGroup.isPrivKeyEncrypted) {
      this.keyProvider
        .decrypt(this.keyId)
        .then(() => {
          const key = this.keyProvider.getKey(this.keyId);
          this.keyProvider.addKey(key);
          this.profileProvider.walletsGroups[
            this.keyId
          ].isPrivKeyEncrypted = false;
          this.logger.debug('Key decrypted');
        })
        .catch(err => {
          this.encryptEnabled = true;
          const title = this.translate.instant('Could not decrypt wallet');
          this.showErrorInfoSheet(err, title);
        });
    }
  }

  private showErrorInfoSheet(
    err: Error | string,
    infoSheetTitle: string
  ): void {
    if (!err) return;
    this.logger.warn('Could not encrypt/decrypt group wallets:', err);
    const errorInfoSheet = this.actionSheetProvider.createInfoSheet(
      'default-error',
      { msg: err, title: infoSheetTitle }
    );
    errorInfoSheet.present();
  }

  public openBackupSettings(): void {
    const derivationStrategy = this.derivationPathHelperProvider.getDerivationStrategy(
      this.wallets[0].credentials.rootPath
    );

    if (derivationStrategy == 'BIP45') {
      this.navCtrl.push(WalletExportPage, {
        walletId: this.wallets[0].credentials.walletId
      });
    } else {
      this.navCtrl.push(BackupKeyPage, {
        keyId: this.keyId
      });
    }
  }

  public openWalletGroupDelete(): void {
    this.navCtrl.push(WalletGroupDeletePage, {
      keyId: this.keyId
    });
  }

  public openWalletGroupExtendedPrivateKey(): void {
    this.navCtrl.push(WalletGroupExtendedPrivateKeyPage, {
      keyId: this.keyId
    });
  }

  public openSupportEncryptPassword(): void {
    const url =
      'https://support.bitpay.com/hc/en-us/articles/360000244506-What-Does-a-Spending-Password-Do-';
    const optIn = true;
    const title = null;
    const message = this.translate.instant('Read more in our support page');
    const okText = this.translate.instant('Open');
    const cancelText = this.translate.instant('Go Back');
    this.externalLinkProvider.open(
      url,
      optIn,
      title,
      message,
      okText,
      cancelText
    );
  }

  openWalletSettings(id) {
    this.navCtrl.push(WalletSettingsPage, { walletId: id });
  }

  public reorder(): void {
    this.showReorder = !this.showReorder;
  }

  public reorderAccounts(indexes): void {
    const element = this.wallets[indexes.from];
    this.wallets.splice(indexes.from, 1);
    this.wallets.splice(indexes.to, 0, element);
    _.each(this.wallets, (wallet, index: number) => {
      this.profileProvider.setWalletOrder(wallet.id, index);
    });
  }

  public goToAddPage() {
    this.navCtrl.push(AddPage, { keyId: this.keyId });
  }

  public openWalletGroupName(): void {
    this.navCtrl.push(WalletGroupNamePage, {
      keyId: this.keyId
    });
  }

  public showWalletGroupOnboardingSlides() {
    const modal = this.modalCtrl.create(WalletGroupOnboardingPage, {
      showBackdrop: false,
      enableBackdropDismiss: false
    });
    modal.present();
  }
}
