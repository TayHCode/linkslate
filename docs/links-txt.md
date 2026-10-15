# links.txt format reference

`links.txt` is a plain text recipe for your page. You can edit it in any text editor. The first content line is your name unless it is a known `name:`, `bio:`, `photo:` or `theme:` key followed by a value. Dotted names such as `John.Doe` and names such as `Artist: Alex` work as written. Comment lines beginning with `#` are ignored. Spaces around unquoted lines are trimmed. A blank line after the name ends the header and starts the links section.

## A complete example

```text
# About me
Jordan Rivera
Writer, walker, and maker
https://example.com/jordan.jpg
theme: sunset

My website https://jordan.example
Notes - https://notes.example
Instagram: https://instagram.com/jordan
Contact https://example.com/contact
Book a call https://example.com/call
```

## Header lines

After your name and before the first link or blank line:

- A line containing only an `https://` URL is your photo URL. An `http://` photo is skipped with a warning; the generated page's security policy only allows HTTPS photos. A photo address without a scheme is treated as HTTPS.
- `theme: clean`, `theme: midnight`, `theme: sunset` or `theme: paper` selects a theme. The default is `clean`.
- The first other plain text line is your bio. Further plain text lines are added to the bio, separated by a space.
- You can also write `name:`, `bio:` or `photo:` before those values. For example, `bio: Artist and parent` or `photo: https://example.com/me.jpg`.

A line with text followed by a URL is a link even before the first link has appeared, except for explicit header keys. For example, `My page https://example.com` is a link, not a bio. The first link line or blank line after the name ends the header. In the links section, only a `theme:` line whose entire value is a valid theme name changes the theme. Thus `Theme: https://example.com` is a link, and `photo:` or `bio:` labels cannot change the profile.

## Link lines

Write a label, then its address as the last whitespace-separated item on that line:

```text
Portfolio https://example.com
My podcast - https://podcast.example/show
Contact https://example.com/contact
```

A label can use `-`, `:`, `|`, `–` or `—` just before the address; that separator is removed. A URL without a scheme is accepted when it contains a dot and is treated as HTTPS, so `Code github.com/jordan` works. A line containing only a URL after the header becomes a link labeled with that address's hostname.

Allowed link address schemes are `http`, `https`, `mailto` and `tel`. For email links, put an email address after `mailto:`; for phone links, put a phone number after `tel:`. Other schemes, including `javascript:` and `data:`, are skipped. Duplicate links are kept. HTTP links still work; the HTTPS requirement applies only to photos.

## Exact text and quoted labels

To preserve a label's punctuation or a leading `#`, put the label in JSON double quotes:

```text
"Photo:" https://example.com/photos
"Theme:" https://example.com/style
"# My site" https://example.com
"" https://example.com/contact
"  Keep these spaces -  " https://example.com/work
```

The quotes are removed when the page is built. Inside quotes, use `\"` for a literal double quote, `\\` for a backslash, `\n` for a newline and `\t` for a tab. Quoted labels keep their trailing separators and whitespace. An empty label becomes the address's hostname (or its email/phone value for `mailto:` and `tel:`). Unquoted labels keep the usual separator-trimming rule.

Header values can also use JSON double quotes, for example `name: "Artist: Alex"` or `bio: "theme: midnight"`. A quoted bio is bio text, even when it looks like a key or contains a URL. The editor writes quoted header values and labels automatically so importing its downloaded `links.txt` preserves your text, link order, photo and theme.

## Text and characters

Unquoted lines are trimmed. Blank lines before your name are ignored; a blank line after it ends the header. Lines beginning with `#` are comments; `"# My site" https://example.com` is a link. Windows line endings (CRLF), a byte order mark, tabs, curly quotes, Unicode and emoji are supported. Labels and bio text can include punctuation. Content is escaped for safe display on the generated page.

## Friendly messages

The builder may show messages such as:

- `Line 7: "Podcast" has no web address, so it was skipped. Add one like: Podcast https://example.com`
- An unknown theme warning that lists the valid themes and says the default theme will be used.
- `Line 3: photo must start with https:// and be a valid web address, so it was skipped.`
- A note when there are no links. A page with just a name and bio is allowed.

If there is no name, the builder stops and shows a friendly error with an example of the correct format. Missing or unsafe link addresses are reported with their line number when possible; the affected link is skipped. Add a name and check the named line, then build again.
