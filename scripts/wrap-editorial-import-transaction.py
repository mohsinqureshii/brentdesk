#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "server" / "services" / "editorialBatchImport.service.ts"
text = path.read_text()
start_marker = "      const categoryRows = [];\n"
end_marker = "      report.importedArticles += 1;\n"
start = text.index(start_marker)
end = text.index(end_marker, start)
segment = text[start:end]
segment = segment.replace("db.", "tx.")
indented = "\n".join(("  " + line) if line else line for line in segment.rstrip("\n").split("\n"))
replacement = (
    "      const persistedArticleId = await db.transaction(async (tx: any) => {\n"
    + indented
    + "\n        return articleId;\n"
    + "      });\n\n"
)
text = text[:start] + replacement + text[end:]
text = text.replace("      report.articleIds.push(articleId);\n", "      report.articleIds.push(persistedArticleId);\n", 1)
path.write_text(text)
print(f"Wrapped transactional article persistence in {path}")
