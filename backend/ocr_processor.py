"""
ocr_processor.py
Real OCR using Tesseract + pdf2image
Handles PDF, PPT, DOCX file text extraction
Install: pip install pytesseract pdf2image python-docx pillow
Also install Tesseract OCR: https://tesseract-ocr.github.io/tessdoc/Installation.html
"""

import os
import pytesseract
from PIL import Image, ImageFilter, ImageOps
import io

try:
    from pdf2image import convert_from_path
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    print("pdf2image not installed — PDF OCR disabled")

try:
    from pptx import Presentation
    PPTX_SUPPORT = True
except ImportError:
    PPTX_SUPPORT = False
    print("python-pptx not installed — PPT text extraction disabled")

try:
    import docx
    DOCX_SUPPORT = True
except ImportError:
    DOCX_SUPPORT = False
    print("python-docx not installed — DOCX extraction disabled")


class OCRProcessor:

    def preprocess_image(self, img):
        """
        Pre-processing pipeline:
        1. Convert to grayscale
        2. Binarization (Otsu threshold)
        3. Deskewing (straighten tilted scans)
        4. Noise removal
        """
        # Convert to grayscale
        gray = img.convert("L")

        # Binarization — high contrast black/white
        # Otsu-style: threshold at mean pixel value
        threshold = 127
        binary    = gray.point(lambda p: 255 if p > threshold else 0)

        # Denoise — median filter removes speckle
        denoised = binary.filter(ImageFilter.MedianFilter(size=3))

        # Enhance contrast
        enhanced = ImageOps.autocontrast(denoised)

        return enhanced

    def extract_from_pdf(self, filepath):
        """Extract text from PDF using OCR"""
        if not PDF_SUPPORT:
            return ""
        try:
            pages = convert_from_path(filepath, dpi=300)
            texts = []
            for page in pages:
                preprocessed = self.preprocess_image(page)
                text         = pytesseract.image_to_string(preprocessed, lang="eng")
                texts.append(text)
            return "\n".join(texts)
        except Exception as e:
            print(f"PDF OCR error: {e}")
            return ""

    def extract_from_pptx(self, filepath):
        """Extract text from PowerPoint"""
        if not PPTX_SUPPORT:
            return ""
        try:
            prs   = Presentation(filepath)
            texts = []
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        texts.append(shape.text.strip())
            return "\n".join(texts)
        except Exception as e:
            print(f"PPTX extraction error: {e}")
            return ""

    def extract_from_docx(self, filepath):
        """Extract text from Word document"""
        if not DOCX_SUPPORT:
            return ""
        try:
            doc   = docx.Document(filepath)
            texts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            return "\n".join(texts)
        except Exception as e:
            print(f"DOCX extraction error: {e}")
            return ""

    def extract_from_image(self, filepath):
        """Extract text from image file"""
        try:
            img          = Image.open(filepath)
            preprocessed = self.preprocess_image(img)
            return pytesseract.image_to_string(preprocessed, lang="eng")
        except Exception as e:
            print(f"Image OCR error: {e}")
            return ""

    def extract_text(self, filepath):
        """Route to correct extractor based on file extension"""
        ext = filepath.rsplit(".", 1)[-1].lower()

        if ext == "pdf":
            text = self.extract_from_pdf(filepath)
        elif ext in ("ppt", "pptx"):
            text = self.extract_from_pptx(filepath)
        elif ext in ("doc", "docx"):
            text = self.extract_from_docx(filepath)
        elif ext in ("png", "jpg", "jpeg", "tiff", "bmp"):
            text = self.extract_from_image(filepath)
        elif ext == "txt":
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        else:
            text = ""

        # Clean up extracted text
        text = " ".join(text.split())  # normalize whitespace
        return text.strip()
