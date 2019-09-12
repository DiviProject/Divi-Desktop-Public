# Changelog

This minor release adds several new features, fixes a number of bugs, and enhances the security and user experience of the client.

# 🚀 Features
* Mini mode allows the client to show only the important information in a small window
* Advanced mode hides/shows certain advanced features that are not necessary or for or confuses non-technical users
* Multiple sources being queried for price data, including an average of all sources
* Notifications for incoming transactions, rewards, successful sends, and Telegram announcements
* Autofill recipient name from the address book on send screen
* Add sorting options for the transaction history
* Set how long the wallet should wait before re-locking by default.
* Uninstall from settings

# 🐛 Bugfixes
* Fixed bug where spendable balance isn't visible from send screen
* [OSX] Fixed bug where USD values and balances would disappear from GUI after sending a transaction
* [OSX] Fixed an issue where Divi Desktop would corrupt if OSX was randomly restarted
* Remove "Enable staking" from settings
* Fix "Rows per page" in settings so that it actually changes how many rows are displayed per page
* Fix promo codes issue
* Transaction cards no longer randomly open/close

# 🎉 Enhancements
* Staking on/off switch
* Updated logos throughout the app
* Additional checks for combine UTXOs
* Remove auto-combine UTXOs in favor of manual setup from settings
* Auto-update closes/reopens app
* Random, community-generated quotes on startup
* Dozens of UI/UX updates
* Dozens of MOCCI improvements
* Improved backend metrics tracking for MOCCI servers
* Improved settings interface
* Updated settings copy and improved functionality for Rescan
* Pagination starts from the top
* Post-sync daemon restart improvements
* Double checkmark to indicate a spendable transaction
* Update price more often, automatically
