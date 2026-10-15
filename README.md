# Linkslate

Turn one plain text file into a simple page with all your links.

## What you get

- Free to use on Cloudflare's free tier
- No ads
- No tracking
- No account with us
- One page that loads fast
- Four themes to choose from

## Your links.txt file

Start with your name. Add your bio, an optional photo URL, a theme, then your links:

```text
Your Name
A short bio about you
https://example.com/photo.jpg
theme: clean

Website https://example.com
Instagram https://instagram.com/yourname
Contact https://example.com/contact
```

A blank line after your name ends the profile header. Dotted names such as `John.Doe` and names such as `Artist: Alex` are accepted. Photos must use HTTPS. In the links section, a valid `theme: paper` line still changes the theme; a label such as `Theme: https://example.com` remains a link.

Quote labels such as `"# My site" https://example.com` or `"Photo:" https://example.com/photos` to keep a leading `#` or trailing punctuation. The editor does this automatically, preserving your text when you download and import `links.txt`. See the [format reference](docs/links-txt.md) for quoting and escape rules.

_Screenshot coming soon: example links page_

## Path A: you have GitHub

1. Click the Deploy to Cloudflare button.
2. Edit `links.txt` on github.com (click the pencil icon) and press Commit.
3. Your page updates by itself in about a minute at your `.workers.dev` address.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/TayHCode/linkslate)


_Screenshot coming soon: edit links.txt on GitHub_

## Path B: no GitHub

1. Open `editor.html` in your browser (download it from the repo's page or the releases area) and type your links.
2. Press **Download zip**.
3. On Cloudflare, go to **Workers & Pages -> Create -> Pages -> Upload assets** (drag and drop) and drop the zip.

_Screenshot coming soon: editor and upload_

## Themes

Choose one of these in your file with a line such as `theme: midnight`:

- `clean` — light and simple
- `midnight` — dark
- `sunset` — gradient colors
- `paper` — serif text

## If something goes wrong

The builder gives friendly messages with line numbers when it skips a link or finds a theme it does not recognize. Check the line it names and make sure each link has a web address at the end, such as `My site https://example.com`. If you leave out your name, it asks you to add one.

**My photo does not show.** Use a public `https://` URL that points directly to an image. HTTP photos are skipped with a line-numbered warning because the page's security policy permits only HTTPS photos. Photos are optional.

**My link was skipped.** Add a web address after its label, for example `Podcast https://example.com`. Use an `https://`, `http://`, `mailto:` or `tel:` address.

## Privacy

There is no database, login, analytics or tracking. The editor runs entirely in your browser. Your generated page makes no outside requests except to load your photo, if you add one, and when someone follows a link.

## FAQ

**Does it cost anything?** This project is designed for Cloudflare's free tier.

**Can I use my own domain?** Custom domains are not supported in v1.

**How do I switch from Path B to Path A?** Put the same links into `links.txt` in the GitHub template and commit the change. You can then use the GitHub update path.

## Run it on your computer

Install Node 18 or newer. Nothing else needs to be installed. In the project folder, run:

```sh
node build.mjs
```

The generated page is in `dist/`.

## Limitations

- There are no analytics or custom domains in v1.
- The Deploy button requires the GitHub repository to be public.
- Photos must use an `https://` URL.
- Cloudflare Pages drag and drop supports up to 1000 files; this project produces a small three-file upload.
- Each site contains one page.
- Generated pages use no JavaScript.

## License

This project is available under the MIT License. See [LICENSE](LICENSE).
