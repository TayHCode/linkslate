# Changelog

## Unreleased

- Rename the product to Linkslate; MIT licensed.

- Trim link-label separators in linear time, including adversarially long labels.
- Preserve editor profile text, reserved labels, whitespace and punctuation in `links.txt` using JSON quoting; a blank line ends the header.
- Accept dotted names and names containing colons on the first content line.
- Skip HTTP photos with a line-numbered HTTPS warning in the CLI and editor, matching the generated security policy.

## v1

- Create a one-page links site from `links.txt`.
- Offer four themes: clean, midnight, sunset and paper.
- Provide a browser editor that downloads a site zip for the no-GitHub path.
- Support deployment through Cloudflare Pages and a GitHub template path.
