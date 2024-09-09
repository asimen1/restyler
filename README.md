# Restyler

## A devtool extension for easy restyling of any webpage

[Get the extension (Chrome Webstore)](https://chrome.google.com/webstore/detail/restyler/ofkkcnbmhaodoaehikkibjanliaeffel)

Restyler lets you change the appearance of any webpage with an easy to use interface.
Ongoing changes in the page are automatically observed so new styling is always taken into account.
Perfect for testing out design changes or rebranding on an existing page!

★ Modify any CSS attribute value such as font, color, margins, etc...

★ Apply styling rule to all elements in the page or to a specific set (using selectors).

★ Edit any text content in the page.

★ Share your styling rules as a config or a CSS file.

Built with `react` + `webpack`.

### Developing Locally

    // install dependencies
    npm install

    // run the dev script
    npm run dev

> Minimum `nodejs` version required is "18.18.0", this is due to `@eslint/js` requirements. The minimum versions are also set in the `engines` field in package.json.

The extension is built to the `dist` folder.

You can now load it via the chrome extensions page chrome://extensions/ -> "Load unpacked extension..."

(Make sure you have "Developer mode" turned on in chrome's extensions page)

### Todos

* Support image sources modification.
* Support editing a rule after it has been added.
* Add the number of matched/modified elements for each rule (can show total matches in extension badge).
* Allow user to save rules as presets (and auto apply them on site url matching).
* Update "inspect" design on web page, perhaps include a psuedo `::before` element with some text.
* Tests?

### License

MIT
