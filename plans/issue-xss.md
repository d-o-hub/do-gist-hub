🔒 Fix XSS vulnerability in gist edit form

🎯 What: Replaced the custom weak esc() function in gist-edit.ts with the project's standard sanitizeHtml utility.
⚠️ Risk: The previous function failed to fully sanitize certain inputs, making the innerHTML assignment in renderEditForm susceptible to XSS if an attacker provided maliciously crafted content in a gist's description, filename, or file contents.
🛡️ Solution: Used sanitizeHtml which is a more robust sanitizer. All dynamic data injected into the renderEditForm template is now properly sanitized using sanitizeHtml.
