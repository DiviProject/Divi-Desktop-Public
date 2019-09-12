export enum AuthScopes {
    // general
    SEND = "send",
    SEND_CONFIRMATION = "send_confirmation",
    RECEIVE = "receive",
    BACKUP = "backup",
    SETUP_TFA = "setup_tfa",
    UNLOCK_WALLET = "unlock_wallet",
    CONSOLE_ACCESS = "console_access",
    FIX_WALLET = "fix_wallet",
    SIGNATURE_VERIFY_MESSAGE = "signature_verify_message",

    // wallet
    WALLET_VERIFY = "wallet-verify",

    // address book
    ADDRESS_BOOK_CREATE = "address_book_create",
    ADDRESS_BOOK_REMOVE = "address_book_remove",

    // addresses
    ADDRESS_ADD_LABEL = "address_add_label",

    // staking
    STAKING = "staking"
} 
