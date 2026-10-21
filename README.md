# Toastify

A lightweight, dependency-free JavaScript toast notification library. You choose where toasts appear and configure how they look and behave.

**Live demo:** `https://edin101021.github.io/toastify/`

## Install

Copy `toastify.js` into your project and load it:

```html
<script src="toastify.js"></script>
```

It also works with CommonJS (`require('./toastify.js')`), ES imports in bundlers (`import Toastify from './toastify.js'`) and AMD.

Or load it from GitHub through jsDelivr:

```html
<script src="https://cdn.jsdelivr.net/gh/edin101021/toastify@v1.0.0/toastify.js"></script>
```

## Usage

```js
Toastify.success('Saved!');
Toastify.error('Something went wrong');
Toastify.show({
  type: 'info',
  title: 'Heads up',
  message: 'New version available',
  position: 'bottom-left'
});

// Global defaults
Toastify.configure({ position: 'top-center', duration: 5000, theme: 'dark' });

// Loading -> success / error
Toastify.promise(fetch('/api/save'), {
  loading: 'Saving…',
  success: 'Saved',
  error: 'Could not save'
});
```

## Positions

`top-left` · `top-center` · `top-right` · `bottom-left` · `bottom-center` · `bottom-right`

## Options

| Option | Default | Description |
| --- | --- | --- |
| `position` | `'top-right'` | Where the toast appears |
| `type` | `'default'` | `default`, `success`, `error`, `warning`, `info`, `loading` |
| `title` / `message` | `''` | Toast content |
| `html` | `false` | Render `message` as HTML (trusted content only) |
| `duration` | `4000` | Milliseconds; `0` keeps it open until closed |
| `theme` | `'light'` | `light`, `dark`, `colored`, `auto` |
| `animation` | `'slide'` | `slide`, `fade`, `zoom`, `bounce` |
| `showProgress` | `true` | Countdown bar |
| `closable` | `true` | Close button |
| `closeOnClick` | `false` | Click the toast to close it |
| `pauseOnHover` | `true` | Pause the timer on hover |
| `pauseOnFocusLoss` | `true` | Pause while the window is not focused |
| `draggable` | `true` | Swipe sideways to dismiss |
| `maxToasts` | `5` | Max visible toasts per position |
| `newestOnTop` | auto | Defaults to `true` for top positions |
| `actions` | `[]` | Buttons: `{ label, onClick, primary, closeOnClick }` |
| `icon` | auto | Custom icon (HTML string or Node); `false` hides it |
| `width` / `offset` / `gap` / `zIndex` | `360` / `16` / `12` / `9999` | Layout, set with `configure()` |
| `onOpen` / `onClose` / `onClick` | `null` | Callbacks that receive the toast handle |

## API

| Method | Description |
| --- | --- |
| `Toastify.show(options)` | Show a toast; returns a handle with `update()` and `dismiss()` |
| `Toastify.success/error/warning/info/loading(msg, opts)` | Shortcuts that set the type |
| `Toastify.promise(promise, messages, opts)` | Loading toast that resolves to success or error |
| `Toastify.update(id, options)` | Change a live toast |
| `Toastify.dismiss(id)` | Close one toast |
| `Toastify.dismissAll(position?)` | Close all toasts, or all in one position |
| `Toastify.configure(options)` | Set global defaults |
| `Toastify.reset()` / `Toastify.destroy()` | Restore defaults / remove everything |

## Deploy the demo to GitHub Pages

1. Create a new repository on GitHub and upload `index.html`, `toastify.js` and `README.md` to the root.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then **Save**.
4. After a minute or two the demo is live at `https://<your-username>.github.io/<repo-name>/`.

---

Designed & built by Edin
