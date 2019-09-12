import { Amount, DateFormatter } from '../../../core/util/utils';

export type TransactionCategory = 'all' | 'stake' | 'coinbase' | 'send' | 'receive' | 'orphaned_stake' | 'internal_transfer';

export class Transaction {

  type: string;

  txid: string;
  address: string;
  fromAddress: string;
  stealth_address: string;
  label: string;
  category: string;
  amount: number;
  reward: number;
  fee: number;
  time: number;
  comment: string;
  n0: string;
  n1: string;

  outputs: any[];

  /* conflicting txs */
  walletconflicts: any[];

  /* block info */
  blockhash: string;
  blockindex: number;
  blocktime: number;
  confirmations: number;

  /* display info */
  displayInfo: any = {
    date: new Date(),
    address: '',
    amount: 0,
    toAddress: '',
    netAmount: '',
    account: ''
  };

  confirmationInfo: any = {
    style: '',
    count: '',
    label: '',
    icon: ''
  };

  constructor(json: any) {
    /* transactions */
    this.txid = json.txid;
    if (json.outputs && json.outputs.length) {
      this.address = json.outputs[0].address;
      this.stealth_address = json.outputs[0].stealth_address;
      this.label = json.outputs[0].label;
    } else if (json.address) {
      this.address = json.address;
    }
    this.category = json.category;
    this.amount = json.amount;
    this.reward = json.reward;
    this.fee = json.fee;
    this.time = json.time;
    this.comment = json.comment;
    this.n0 = json.n0;
    this.n1 = json.n1;

    this.outputs = json.outputs;

    /* conflicting txs */
    this.walletconflicts = json.walletconflicts;

    /* block info */
    this.blockhash = json.blockhash;
    this.blockindex = json.blockindex;
    this.blocktime = json.blocktime;
    this.confirmations = json.confirmations;

    this.confirmationInfo = getConfirmationInfo(this);

    /* init display data */
    this.displayInfo = {
      date: this.getBlockDate(),
      address: this.getAddress(),
      amount: this.getAmountObject().getAmount().toLocaleString(),
      toAddress: this.getToOrFromAddress(),
      netAmount: this.getNetAmount(),
      account: (json.account || '')
    };
  }

  public getAddress(): string {
    if (this.stealth_address === undefined) {
      return this.address;
    }
    return this.stealth_address;
  }

  public getToOrFromAddress(): string {
    if (this.fromAddress) {
      return this.fromAddress;
    }

    return this.getAddress();
  }

  /* Amount stuff */
  public getAmount(): number {
   if (this.category === 'internal_transfer') {
      // only use fake output to determine internal transfer
      const fakeOutput = function (a: any, b: any) { return a - (b.vout === 65535 ? b.amount : 0); }
      return this.outputs.reduce(fakeOutput, 0);
    } else {
      return +this.amount;
    }
  }

  /** Turns amount into an Amount Object */
  public getAmountObject(): Amount {
    return new Amount(this.getAmount());
  }

  /** Calculates the actual amount that was transfered, including the fee */
  /* todo: fee is not defined in normal receive tx, wut? */
  public getNetAmount(): number {
    const amount: number = +this.getAmountObject().getAmount();

    /* If fee undefined then just return amount */
    if (this.fee === undefined) {
      return amount;
    /* sent */
    } else if (amount < 0) {
      return new Amount(+amount + (+this.fee)).getAmount();
    } else {
      return new Amount(+amount - (+this.fee)).getAmount();
    }
  }

  /* Date stuff */
  public getDate(): Date {
    return new Date(this.time * 1000);
  }

  public getBlockDate(): Date {
    const date = new Date(this.blocktime * 1000);
    return date.toString() === 'Invalid Date' ? new Date() : date;
  }
}

function getNeedConfirmationsByCategory(category: string): number {
  switch (category) {
    case 'send':
    case 'receive':
      return 12;
    case 'stake_reward':
    case 'mn_reward':
    case 'lottery':
      return 21;
    case 'move':
      return 15;
    default:
      return 12;
  }
}

function getConfirmationInfo(tx: Transaction): any {
  const confirmations = getNeedConfirmationsByCategory(tx.category);

  const getConfirmationCount = (tx: Transaction) => {
    return tx.confirmations > confirmations ? confirmations + '+' : tx.confirmations.toString();
  };

  const getConfirmationStyle = (tx: Transaction) => {
    const confirmations = getNeedConfirmationsByCategory(tx.category);

    if (tx.confirmations <= 0) {
      return 'confirm-none';
    } else if (tx.confirmations >= 1 && tx.confirmations < confirmations) {
      return 'confirm-1';
    } else {
      return 'confirm-ok';
    }
  };

  const getConfirmationLabel = (tx: Transaction) => {
    const confirmations = getNeedConfirmationsByCategory(tx.category);

    if (tx.confirmations < confirmations) {
      return 'confirming';
    }

    switch(tx.category) {
      case 'move':
        return 'moved';
      case 'send':
        return 'sent';
      default:
        return 'spendable';
    }
  };

  const getConfirmationIcon = (tx: Transaction) => {
    if (tx.confirmations === 0) {
      return 'part-date';
    } else {
      return 'part-check';
    }
  };

  const getTooltip = (tx) => {
    const confirmations = getNeedConfirmationsByCategory(tx.category);

    if (confirmations > tx.confirmations) {
      return `${tx.confirmations}/${confirmations} confirmations`;
    }

    switch (tx.category) {
      case 'move':
        return 'Funds were moved between accounts/addresses but still exist in your wallet';
      default:
        return 'These funds are now spendable';
    }
  };

  return {
    icon: getConfirmationIcon(tx),
    label: getConfirmationLabel(tx),
    style: getConfirmationStyle(tx),
    count: getConfirmationCount(tx),
    tooltip: getTooltip(tx)
  };
};
