"""
Minimal PDF generation for demo/seed manuscripts. Extracted from the old
seed_demo_data command so both the retired demo seeder and the new
seed_ml_dataset command (apps/matching/management/commands/) can build a
plausible-looking manuscript PDF without duplicating this reportlab
boilerplate.
"""
import io

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_pdf_bytes(title, authors_line, abstract, body_paragraphs):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER, title=title)
    styles = getSampleStyleSheet()
    story = [
        Paragraph(title, styles['Title']),
        Spacer(1, 10),
        Paragraph(authors_line, styles['Normal']),
        Spacer(1, 14),
        Paragraph('Abstract', styles['Heading2']),
        Paragraph(abstract, styles['BodyText']),
    ]
    for p in body_paragraphs:
        story.append(Spacer(1, 8))
        story.append(Paragraph(p, styles['BodyText']))
    doc.build(story)
    buf.seek(0)
    return buf.read()
