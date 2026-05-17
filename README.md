# Custom Emojis for SillyTavern

A SillyTavern UI extension that lets you upload your own emoji images and use them in chat — as small inline emojis or as large stacked reaction images.

<img width="40%" alt="image" src="https://github.com/user-attachments/assets/d81006b6-4a56-4f9c-854f-2771eb8dcd64" />

## Features

- **Inline emojis** — use `:shortcode:` to place a small inline image mid-sentence
- **Reaction images** — use `<:shortcode:>` to place a large image that always appears after the message text, stacked vertically
- Upload images from your computer or paste an image URL / data URL
- Configurable reaction image size (40–400px) via a slider in settings
- GIF support
- Persistent settings stored in SillyTavern
- Independent enable/disable toggles for emoji rendering and reaction images

## Inline Emojis

Add an emoji with the shortcode `true`, then type anywhere in a message:

```
I agree :true:
```

The `:true:` token is replaced with the uploaded image at text size, inline with the surrounding characters.

## Reaction Images

Wrap any shortcode in angle brackets to use it as a reaction image:

```
That's wild <:isheserious:>
```

Reaction images are:
- **Always placed after the message text**, even if typed mid-sentence
- **Stacked vertically** when multiple are used
- **Sized independently** from inline emojis — adjust the slider in settings

Multiple reaction images stack in the order they appear in the message:

```
No way <:shocked:> <:dead:>
```

The same emoji list is shared between both modes — there is no separate list for reaction images.

## Settings

| Option | Description |
|---|---|
| Enable emoji rendering | Master toggle for all custom emoji processing |
| Enable reaction images | Show or hide `<:shortcode:>` reaction images (tokens are still removed from text) |
| Reaction image size | Width of reaction images in pixels (40–400px, default 120px) |

## Installation

Copy this extension's GitHub URL:

```
https://github.com/Erdash4/st-emojis/
```

Go to **Extensions → Install Extension**, paste the URL, and choose *Install for all users* or *Install just for me*.

## Notes

- Emoji images are stored as data URLs in extension settings when uploaded from disk.
- Tokens are display-only — the model still receives the raw text (`:shortcode:` or `<:shortcode:>`). Describe your emojis in the character card or system prompt so bots know how to use them.
- Unknown shortcodes (ones with no matching emoji entry) are left as plain text.
- This extension only affects the chat UI — it does not modify the prompt sent to the model.
