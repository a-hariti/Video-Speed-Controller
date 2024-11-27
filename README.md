# Video Speed Controller Chrome Extension

A lightweight Chrome extension that allows you to control video and audio playback speed on any webpage.

## Features

- Works on any webpage with video or audio content
- Simple keyboard shortcuts
- Clean, minimal speed indicator
- Special handling for YouTube to prevent duplicate speed indicators
- Only affects currently playing media

## Keyboard Shortcuts

- `Shift + >` : Increase speed
- `Shift + <` : Decrease speed

These shortcuts are inspired by Youtube's keyboard shortcuts.

## Speed Increments

The following speed increments are available:
- 0.75x
- 1x (Normal)
- 1.5x
- 1.75x
- 2x
- 2.5x
- 3x
- 3.5x

## Installation

1. Clone this repository or download the source code or download as a zip file and extract it
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Visit any webpage with video or audio content
2. Use `Shift + >` to increase speed
3. Use `Shift + <` to decrease speed
4. A small overlay will appear in the bottom-left corner showing the current speed

## Notes

- The extension only affects the currently playing media element
- Speed changes are temporary and reset when the page is reloaded
- The speed indicator automatically disappears after a short delay

## License

This project is released under the [MIT License](https://opensource.org/licenses/MIT).


Built with ❤️ by [Abdellah](https://twitter.com/_hariti)