# Custom Emojis for SillyTavern

A SillyTavern UI extension that lets you upload your own emoji images and use them in chat with shortcodes like `:true:`.

## Features

- Upload images from your computer
- Paste image URLs or data URLs
- Render custom emoji shortcodes in user and bot messages
- Persistent settings stored in SillyTavern
- Works with plain text tokens like `:true:`

## How it works

Add an emoji named `true`, then type:

`I agree :true:`

The chat renderer will replace that token with the uploaded image.

## Installation

Copy the folder into your SillyTavern third-party extensions directory, then enable the extension in the Extensions panel.

## Notes

- Emoji images are stored in extension settings as data URLs when uploaded.
- The model still receives the text token unless you separately modify prompt text processing.
- This extension only changes how messages are displayed in the chat UI.


## v2 fixes

- Shortcode inputs no longer re-render on every keystroke.
- File uploads are handled separately from text input events.
- Chat scanning no longer rewrites stored HTML, which prevents edit/streaming breakage.
- Text inputs now use a black background for readability.
