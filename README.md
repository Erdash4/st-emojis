# Custom Emojis for SillyTavern

A SillyTavern UI extension that lets you upload your own emoji images and use them in chat with Discord-esque shortcodes like `:true:`.  

<img width="389" height="412" alt="image" src="https://github.com/user-attachments/assets/9380dd43-f093-47f4-be1a-535c84db5833" />

## Features

- Upload images from your computer
- Standard emojis can also be used in shortcode. (Example: `:grin:` --> :grin:)
- Paste image URLs or data URLs
- Render custom emoji shortcodes in user and bot messages
- Persistent settings stored in SillyTavern
- GIF support
- Works with plain text tokens like `:true:`


## How it works

Add an emoji named `true`, then type:

`I agree :true:`

The chat renderer will replace that token with the uploaded image.

## Installation

Copy this extension's github link: `https://github.com/Erdash4/st-emojis/`, go to extensions, click on the "Install Extension" button located on the top right and paste this into the first text field. 

## Notes

- Emoji images are stored in extension settings as data URLs when uploaded.
- The model still receives the text token unless you separately modify prompt text processing.
- This extension only changes how messages are displayed in the chat UI.
- Message streaming is broken, so you'll have to disable it to use the extension.

