import { Injectable } from '@angular/core';
import { File } from '@ionic-native/file';
import * as _ from 'lodash';
import { Logger } from '../../providers/logger/logger';

import { GiftCard } from '../gift-card/gift-card.types';
import { PlatformProvider } from '../platform/platform';
import { FileStorage } from './storage/file-storage';
import { LocalStorage } from './storage/local-storage';
// TODO import { RamStorage } from './storage/ram-storage';

export enum Network {
  livenet = 'livenet',
  testnet = 'testnet'
}

export interface FeedbackValues {
  time: number;
  version: string;
  sent: boolean;
}

export interface GiftCardMap {
  [invoiceId: string]: GiftCard;
}

const Keys = {
  ADDRESS_BOOK: network => 'addressbook-' + network,
  AGREE_DISCLAIMER: 'agreeDisclaimer',
  GIFT_CARD_USER_INFO: 'amazonUserInfo', // keeps legacy key for backwards compatibility
  APP_IDENTITY: network => 'appIdentity-' + network,
  BACKUP: walletId => 'backup-' + walletId,
  BACKUP_WALLET_GROUP: keyId => 'walletGroupBackup-' + keyId,
  BALANCE_CACHE: cardId => 'balanceCache-' + cardId,
  BITPAY_ACCOUNTS_V2: network => 'bitpayAccounts-v2-' + network,
  CLEAN_AND_SCAN_ADDRESSES: 'CleanAndScanAddresses',
  COINBASE_REFRESH_TOKEN: network => 'coinbaseRefreshToken-' + network,
  COINBASE_TOKEN: network => 'coinbaseToken-' + network,
  COINBASE_TXS: network => 'coinbaseTxs-' + network,
  CONFIG: 'config',
  FEEDBACK: 'feedback',
  SURVEY: 'survey',
  ETH_LIVE_CARD: 'ethLiveCard',
  FOCUSED_WALLET_ID: 'focusedWalletId',
  GIFT_CARD_CONFIG_CACHE: (network: Network) => {
    const suffix = network === Network.livenet ? '' : `-${network}`;
    return `giftCardConfigCache${suffix}`;
  },
  ACTIVE_GIFT_CARDS: (network: Network) => {
    return `activeGiftCards-${network}`;
  },
  GIFT_CARDS: (cardName: string, network: Network) => {
    const legacyGiftCardKey = getLegacyGiftCardKey(cardName, network);
    return legacyGiftCardKey || `giftCards-${cardName}-${network}`;
  },
  HIDE_GIFT_CARD_DISCOUNT_ITEM: 'hideGiftCardDiscountItem',
  HIDE_BALANCE: walletId => 'hideBalance-' + walletId,
  HIDE_WALLET: walletId => 'hideWallet-' + walletId,
  KEYS: 'keys',
  LAST_ADDRESS: walletId => 'lastAddress-' + walletId,
  LAST_CURRENCY_USED: 'lastCurrencyUsed',
  PROFILE: 'profile',
  PROFILE_OLD: 'profileOld',
  REMOTE_PREF_STORED: 'remotePrefStored',
  TX_CONFIRM_NOTIF: txid => 'txConfirmNotif-' + txid,
  TX_HISTORY: walletId => 'txsHistory-' + walletId,
  ORDER_WALLET: walletId => 'order-' + walletId,
  SERVER_MESSAGE_DISMISSED: messageId => 'serverMessageDismissed-' + messageId,
  SHAPESHIFT_TOKEN: network => 'shapeshiftToken-' + network,
  WALLET_GROUP_NAME: keyId => `Key-${keyId}`
};

interface Storage {
  get(k: string): Promise<any>;
  set(k: string, v): Promise<void>;
  remove(k: string): Promise<void>;
  create(k: string, v): Promise<void>;
}

@Injectable()
export class PersistenceProvider {
  public storage: Storage;

  constructor(
    private logger: Logger,
    private platform: PlatformProvider,
    private file: File
  ) {
    this.logger.debug('PersistenceProvider initialized');
  }

  public load() {
    this.storage = this.platform.isCordova
      ? new FileStorage(this.file, this.logger)
      : new LocalStorage(this.logger);
  }

  storeProfileLegacy(profileOld) {
    return this.storage.set(Keys.PROFILE_OLD, profileOld);
  }

  getProfileLegacy(): Promise<void> {
    return this.storage.get(Keys.PROFILE_OLD);
  }

  removeProfileLegacy(): Promise<void> {
    return this.storage.remove(Keys.PROFILE_OLD);
  }

  storeNewProfile(profile): Promise<void> {
    return this.storage.create(Keys.PROFILE, profile);
  }

  storeProfile(profile): Promise<void> {
    return this.storage.set(Keys.PROFILE, profile);
  }

  getProfile(): Promise<any> {
    return new Promise(resolve => {
      this.storage.get(Keys.PROFILE).then(profile => {
        resolve(profile);
      });
    });
  }

  setKeys(keys: any[]) {
    return this.storage.set(Keys.KEYS, keys);
  }

  getKeys() {
    return this.storage.get(Keys.KEYS);
  }

  setFeedbackInfo(feedbackValues: FeedbackValues) {
    return this.storage.set(Keys.FEEDBACK, feedbackValues);
  }

  getFeedbackInfo() {
    return this.storage.get(Keys.FEEDBACK);
  }

  setSurveyFlag() {
    return this.storage.set(Keys.SURVEY, true);
  }

  getSurveyFlag() {
    return this.storage.get(Keys.SURVEY);
  }

  setEthLiveCardFlag() {
    return this.storage.set(Keys.ETH_LIVE_CARD, true);
  }

  getEthLiveCardFlag() {
    return this.storage.get(Keys.ETH_LIVE_CARD);
  }

  storeFocusedWalletId(walletId: string) {
    return this.storage.set(Keys.FOCUSED_WALLET_ID, walletId || '');
  }

  getFocusedWalletId(): Promise<string> {
    return this.storage.get(Keys.FOCUSED_WALLET_ID);
  }

  getLastAddress(walletId: string) {
    return this.storage.get(Keys.LAST_ADDRESS(walletId));
  }

  storeLastAddress(walletId: string, address) {
    return this.storage.set(Keys.LAST_ADDRESS(walletId), address);
  }

  clearLastAddress(walletId: string) {
    return this.storage.remove(Keys.LAST_ADDRESS(walletId));
  }

  setBackupFlag(walletId: string) {
    return this.storage.set(Keys.BACKUP(walletId), Date.now());
  }

  getBackupFlag(walletId: string) {
    return this.storage.get(Keys.BACKUP(walletId));
  }

  clearBackupFlag(walletId: string) {
    return this.storage.remove(Keys.BACKUP(walletId));
  }

  setBackupGroupFlag(keyId: string, timestamp?) {
    timestamp = timestamp || Date.now();
    return this.storage.set(Keys.BACKUP_WALLET_GROUP(keyId), timestamp);
  }

  getBackupGroupFlag(keyId: string) {
    return this.storage.get(Keys.BACKUP_WALLET_GROUP(keyId));
  }

  clearBackupGroupFlag(keyId: string) {
    return this.storage.remove(Keys.BACKUP_WALLET_GROUP(keyId));
  }

  setCleanAndScanAddresses(walletId: string) {
    return this.storage.set(Keys.CLEAN_AND_SCAN_ADDRESSES, walletId);
  }

  getCleanAndScanAddresses() {
    return this.storage.get(Keys.CLEAN_AND_SCAN_ADDRESSES);
  }

  removeCleanAndScanAddresses() {
    return this.storage.remove(Keys.CLEAN_AND_SCAN_ADDRESSES);
  }

  getConfig() {
    return this.storage.get(Keys.CONFIG);
  }

  storeConfig(config: object) {
    return this.storage.set(Keys.CONFIG, config);
  }

  clearConfig() {
    return this.storage.remove(Keys.CONFIG);
  }

  setHideBalanceFlag(walletId: string, val) {
    return this.storage.set(Keys.HIDE_BALANCE(walletId), val);
  }

  getHideBalanceFlag(walletId: string) {
    return this.storage.get(Keys.HIDE_BALANCE(walletId));
  }

  setHideWalletFlag(walletId: string, val) {
    return this.storage.set(Keys.HIDE_WALLET(walletId), val);
  }

  getHideWalletFlag(walletId: string) {
    return this.storage.get(Keys.HIDE_WALLET(walletId));
  }

  setDisclaimerAccepted() {
    return this.storage.set(Keys.AGREE_DISCLAIMER, true);
  }

  // for compatibility
  getCopayDisclaimerFlag() {
    return this.storage.get(Keys.AGREE_DISCLAIMER);
  }

  setRemotePrefsStoredFlag() {
    return this.storage.set(Keys.REMOTE_PREF_STORED, true);
  }

  getRemotePrefsStoredFlag() {
    return this.storage.get(Keys.REMOTE_PREF_STORED);
  }

  setCoinbaseToken(network: string, token: string) {
    return this.storage.set(Keys.COINBASE_TOKEN(network), token);
  }

  getCoinbaseToken(network: string) {
    return this.storage.get(Keys.COINBASE_TOKEN(network));
  }

  removeCoinbaseToken(network: string) {
    return this.storage.remove(Keys.COINBASE_TOKEN(network));
  }

  setCoinbaseRefreshToken(network: string, token: string) {
    return this.storage.set(Keys.COINBASE_REFRESH_TOKEN(network), token);
  }

  getCoinbaseRefreshToken(network: string) {
    return this.storage.get(Keys.COINBASE_REFRESH_TOKEN(network));
  }

  removeCoinbaseRefreshToken(network: string) {
    return this.storage.remove(Keys.COINBASE_REFRESH_TOKEN(network));
  }

  setCoinbaseTxs(network: string, ctx) {
    return this.storage.set(Keys.COINBASE_TXS(network), ctx);
  }

  getCoinbaseTxs(network: string) {
    return this.storage.get(Keys.COINBASE_TXS(network));
  }

  removeCoinbaseTxs(network: string) {
    return this.storage.remove(Keys.COINBASE_TXS(network));
  }

  setAddressBook(network: string, addressbook) {
    return this.storage.set(Keys.ADDRESS_BOOK(network), addressbook);
  }

  getAddressBook(network: string) {
    return this.storage.get(Keys.ADDRESS_BOOK(network));
  }

  removeAddressbook(network: string) {
    return this.storage.remove(Keys.ADDRESS_BOOK(network));
  }

  setLastCurrencyUsed(lastCurrencyUsed) {
    return this.storage.set(Keys.LAST_CURRENCY_USED, lastCurrencyUsed);
  }

  getLastCurrencyUsed() {
    return this.storage.get(Keys.LAST_CURRENCY_USED);
  }

  checkQuota() {
    let block = '';
    // 50MB
    for (let i = 0; i < 1024 * 1024; ++i) {
      block += '12345678901234567890123456789012345678901234567890';
    }
    this.storage.set('test', block).catch(err => {
      this.logger.error('CheckQuota Return:' + err);
    });
  }

  setTxHistory(walletId: string, txs) {
    return this.storage.set(Keys.TX_HISTORY(walletId), txs).catch(err => {
      this.logger.error('Error saving tx History. Size:' + txs.length);
      this.logger.error(err);
    });
  }

  getTxHistory(walletId: string) {
    return this.storage.get(Keys.TX_HISTORY(walletId));
  }

  removeTxHistory(walletId: string) {
    return this.storage.remove(Keys.TX_HISTORY(walletId));
  }

  setLastKnownBalance(id: string, balance: string) {
    let updatedOn = Math.floor(Date.now() / 1000);
    return this.storage.set(Keys.BALANCE_CACHE(id), {
      updatedOn,
      balance
    });
  }

  getLastKnownBalance(id: string) {
    return this.storage.get(Keys.BALANCE_CACHE(id));
  }

  removeLastKnownBalance(id: string) {
    return this.storage.remove(Keys.BALANCE_CACHE(id));
  }

  setAppIdentity(network: string, data) {
    return this.storage.set(Keys.APP_IDENTITY(network), data);
  }

  getAppIdentity(network: string) {
    return this.storage.get(Keys.APP_IDENTITY(network));
  }

  removeAppIdentity(network: string) {
    return this.storage.remove(Keys.APP_IDENTITY(network));
  }

  removeAllWalletData(walletId: string) {
    this.clearLastAddress(walletId);
    this.removeTxHistory(walletId);
    this.clearBackupFlag(walletId);
    this.removeWalletOrder(walletId);
  }

  removeAllWalletGroupData(keyId: string) {
    this.clearBackupGroupFlag(keyId);
  }

  getActiveGiftCards(network: Network) {
    return this.storage.get(Keys.ACTIVE_GIFT_CARDS(network));
  }

  setActiveGiftCards(network: Network, data) {
    return this.storage.set(Keys.ACTIVE_GIFT_CARDS(network), data);
  }

  getGiftCardConfigCache(network: Network) {
    return this.storage.get(Keys.GIFT_CARD_CONFIG_CACHE(network));
  }

  removeGiftCardConfigCache(network: Network) {
    return this.storage.remove(Keys.GIFT_CARD_CONFIG_CACHE(network));
  }

  setGiftCardConfigCache(network: Network, data) {
    return this.storage.set(Keys.GIFT_CARD_CONFIG_CACHE(network), data);
  }

  setGiftCardUserInfo(data) {
    return this.storage.set(Keys.GIFT_CARD_USER_INFO, data);
  }

  getGiftCardUserInfo() {
    return this.storage.get(Keys.GIFT_CARD_USER_INFO);
  }

  removeGiftCardUserInfo() {
    return this.storage.remove(Keys.GIFT_CARD_USER_INFO);
  }

  setHideGiftCardDiscountItem(data: boolean) {
    return this.storage.set(Keys.HIDE_GIFT_CARD_DISCOUNT_ITEM, data);
  }

  getHideGiftCardDiscountItem() {
    return this.storage.get(Keys.HIDE_GIFT_CARD_DISCOUNT_ITEM);
  }

  removeHideGiftCardDiscountItem() {
    return this.storage.remove(Keys.HIDE_GIFT_CARD_DISCOUNT_ITEM);
  }

  setTxConfirmNotification(txid: string, val) {
    return this.storage.set(Keys.TX_CONFIRM_NOTIF(txid), val);
  }

  getTxConfirmNotification(txid: string) {
    return this.storage.get(Keys.TX_CONFIRM_NOTIF(txid));
  }

  removeTxConfirmNotification(txid: string) {
    return this.storage.remove(Keys.TX_CONFIRM_NOTIF(txid));
  }

  getBitpayAccounts(network: string) {
    return this.storage.get(Keys.BITPAY_ACCOUNTS_V2(network));
  }

  setBitpayAccount(
    network: string,
    data: {
      email: string;
      token: string;
      familyName?: string; // last name
      givenName?: string; // firstName
    }
  ) {
    return this.getBitpayAccounts(network).then(allAccounts => {
      allAccounts = allAccounts || {};
      let account = allAccounts[data.email] || {};
      account.token = data.token;
      account.familyName = data.familyName;
      account.givenName = data.givenName;
      allAccounts[data.email] = account;

      this.logger.info(
        'Storing BitPay accounts with new account:' + data.email
      );
      return this.storage.set(Keys.BITPAY_ACCOUNTS_V2(network), allAccounts);
    });
  }

  removeBitpayAccount(network: string, email: string) {
    return this.getBitpayAccounts(network).then(allAccounts => {
      allAccounts = allAccounts || {};
      delete allAccounts[email];
      return this.storage.set(Keys.BITPAY_ACCOUNTS_V2(network), allAccounts);
    });
  }

  setBitpayDebitCards(network: string, email: string, cards) {
    return this.getBitpayAccounts(network).then(allAccounts => {
      allAccounts = allAccounts || {};
      if (!allAccounts[email])
        throw new Error('Cannot set cards for unknown account ' + email);
      allAccounts[email].cards = cards;
      return this.storage.set(Keys.BITPAY_ACCOUNTS_V2(network), allAccounts);
    });
  }

  // cards: [
  //   eid: card id
  //   id: card id
  //   lastFourDigits: card number
  //   token: card token
  //   email: account email
  // ]
  getBitpayDebitCards(network: string) {
    return this.getBitpayAccounts(network).then(allAccounts => {
      let allCards = [];
      _.each(allAccounts, (account, email) => {
        if (account.cards) {
          // Add account's email to each card
          var cards = _.clone(account.cards);
          _.each(cards, x => {
            x.email = email;
          });

          allCards = allCards.concat(cards);
        }
      });
      return allCards;
    });
  }

  removeBitpayDebitCard(network: string, cardEid: string) {
    return this.getBitpayAccounts(network)
      .then(allAccounts => {
        return _.each(allAccounts, account => {
          account.cards = _.reject(account.cards, {
            eid: cardEid
          });
        });
      })
      .then(allAccounts => {
        return this.storage.set(Keys.BITPAY_ACCOUNTS_V2(network), allAccounts);
      });
  }

  setGiftCards(cardName: string, network: Network, gcs: string) {
    return this.storage.set(Keys.GIFT_CARDS(cardName, network), gcs);
  }

  getGiftCards(cardName: string, network: Network): Promise<GiftCardMap> {
    return this.storage.get(Keys.GIFT_CARDS(cardName, network));
  }

  setServerMessageDismissed(id) {
    return this.storage.set(Keys.SERVER_MESSAGE_DISMISSED(id), 'dismissed');
  }

  getServerMessageDismissed(id) {
    return this.storage.get(Keys.SERVER_MESSAGE_DISMISSED(id));
  }

  removeServerMessageDismissed(id) {
    return this.storage.remove(Keys.SERVER_MESSAGE_DISMISSED(id));
  }

  setShapeshift(network: string, gcs) {
    return this.storage.set('shapeShift-' + network, gcs);
  }

  getShapeshift(network: string) {
    return this.storage.get('shapeShift-' + network);
  }

  removeShapeshift(network: string) {
    return this.storage.remove('shapeShift-' + network);
  }

  setShapeshiftToken(network: string, token: string) {
    return this.storage.set(Keys.SHAPESHIFT_TOKEN(network), token);
  }

  getShapeshiftToken(network: string) {
    return this.storage.get(Keys.SHAPESHIFT_TOKEN(network));
  }

  removeShapeshiftToken(network: string) {
    return this.storage.remove(Keys.SHAPESHIFT_TOKEN(network));
  }

  setWalletOrder(walletId: string, order: number) {
    return this.storage.set(Keys.ORDER_WALLET(walletId), order);
  }

  getWalletOrder(walletId: string) {
    return this.storage.get(Keys.ORDER_WALLET(walletId));
  }

  removeWalletOrder(walletId: string) {
    return this.storage.remove(Keys.ORDER_WALLET(walletId));
  }

  setLockStatus(isLocked: string) {
    return this.storage.set('lockStatus', isLocked);
  }

  getLockStatus() {
    return this.storage.get('lockStatus');
  }

  removeLockStatus() {
    return this.storage.remove('lockStatus');
  }

  setEmailLawCompliance(value: string) {
    return this.storage.set('emailLawCompliance', value);
  }

  getEmailLawCompliance() {
    return this.storage.get('emailLawCompliance');
  }

  removeEmailLawCompliance() {
    return this.storage.remove('emailLawCompliance');
  }

  setHiddenFeaturesFlag(value: string) {
    this.logger.debug('Hidden features: ', value);
    return this.storage.set('hiddenFeatures', value);
  }

  getHiddenFeaturesFlag() {
    return this.storage.get('hiddenFeatures');
  }

  removeHiddenFeaturesFlag() {
    return this.storage.remove('hiddenFeatures');
  }

  setWalletGroupName(keyId: string, name: string) {
    return this.storage.set(Keys.WALLET_GROUP_NAME(keyId), name);
  }

  getWalletGroupName(keyId: string) {
    return this.storage.get(Keys.WALLET_GROUP_NAME(keyId));
  }

  removeWalletGroupName(keyId: string) {
    return this.storage.remove(Keys.WALLET_GROUP_NAME(keyId));
  }
}

function getLegacyGiftCardKey(cardName: string, network: Network) {
  switch (cardName + network) {
    case 'Amazon.com' + Network.livenet:
      return 'amazonGiftCards-livenet';
    case 'Amazon.com' + Network.testnet:
      return 'amazonGiftCards-testnet';
    case 'Amazon.co.jp' + Network.livenet:
      return 'amazonGiftCards-livenet-japan';
    case 'Amazon.co.jp' + Network.testnet:
      return 'amazonGiftCards-testnet-japan';
    case 'Mercado Livre' + Network.livenet:
      return 'MercadoLibreGiftCards-livenet';
    case 'Mercado Livre' + Network.testnet:
      return 'MercadoLibreGiftCards-testnet';
    default:
      return undefined;
  }
}
