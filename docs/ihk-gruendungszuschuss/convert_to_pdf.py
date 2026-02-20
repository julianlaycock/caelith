import os
import glob
import markdown
from playwright.sync_api import sync_playwright

CSS = """
@page {
    size: A4;
    margin: 20mm 20mm 25mm 20mm;
}
body {
    font-family: "Segoe UI", Calibri, Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #222;
    max-width: 100%;
}
h1 {
    font-size: 18pt;
    color: #1a1a2e;
    border-bottom: 2px solid #1a1a2e;
    padding-bottom: 6px;
    margin-top: 0;
}
h2 {
    font-size: 14pt;
    color: #1a1a2e;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
    margin-top: 20px;
}
h3 {
    font-size: 12pt;
    color: #333;
    margin-top: 16px;
}
table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    font-size: 10pt;
}
th, td {
    border: 1px solid #ccc;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
}
th {
    background-color: #1a1a2e;
    color: white;
    font-weight: 600;
}
tr:nth-child(even) {
    background-color: #f8f8f8;
}
hr {
    border: none;
    border-top: 1px solid #ddd;
    margin: 16px 0;
}
blockquote {
    border-left: 3px solid #1a1a2e;
    padding-left: 12px;
    margin-left: 0;
    color: #555;
    font-style: italic;
}
strong {
    color: #1a1a2e;
}
ul, ol {
    padding-left: 20px;
}
li {
    margin-bottom: 3px;
}
"""

dir_path = os.path.dirname(os.path.abspath(__file__))
md_files = sorted(glob.glob(os.path.join(dir_path, "*.md")))

with sync_playwright() as p:
    browser = p.chromium.launch()
    
    for md_file in md_files:
        basename = os.path.splitext(os.path.basename(md_file))[0]
        if basename == "convert_to_pdf":
            continue
        pdf_file = os.path.join(dir_path, basename + ".pdf")
        
        with open(md_file, "r", encoding="utf-8") as f:
            md_content = f.read()
        
        html_content = markdown.markdown(md_content, extensions=["tables", "fenced_code"])
        
        full_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{CSS}</style></head>
<body>{html_content}</body></html>"""
        
        page = browser.new_page()
        page.set_content(full_html, wait_until="networkidle")
        page.pdf(path=pdf_file, format="A4", margin={"top": "20mm", "bottom": "25mm", "left": "20mm", "right": "20mm"}, print_background=True)
        page.close()
        
        size_kb = os.path.getsize(pdf_file) / 1024
        print(f"  OK  {basename}.pdf ({size_kb:.1f} KB)")
    
    browser.close()

print("\nDone! All PDFs generated.")
