# Changelog

This patch update addresses a number of minor and moderate bugs and makes significant enhancements to MOCCI and the UI/UX.

## 🐛 Bugfixes
* Remote node reboot solutions have been implemented to handle migrated/downed remote servers
* "Insufficient funds" no longer appears on dismantled/redeployed MOCCI nodes
* If Step 6 of MOCCI deployment hangs, the client will automatically retry 

## 🎉 Enhancements
* The "Combine UTXOs" button has been moved to the Settings panel
* UTXO combination is now automated. Automation can be turned off in the Settings panel.
* Refresh MOCCI node status button
* Retry and abandon options are available for the Blockchain Primer
* Await full entry input before determining 2FA correctness
* Separate backup and recovery modals
* Second shutdown attempt implemented for hung shutdowns
* Optimistic UI enhancements
* Mac OSX users can now use `cmd + Q` to quit the app
* Security updates