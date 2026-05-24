package com.pdfanalyzer;

import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class FontAnalyzingStripper extends PDFTextStripper {

    public static class Run {
        public final String text;
        public final float fontSize;
        public final String fontName;
        public final int page;
        public final float y;

        Run(String text, float fontSize, String fontName, int page, float y) {
            this.text = text;
            this.fontSize = fontSize;
            this.fontName = fontName;
            this.page = page;
            this.y = y;
        }
    }

    private final List<Run> runs = new ArrayList<>();

    public FontAnalyzingStripper() throws IOException {
        super();
        setSortByPosition(true);
    }

    public List<Run> getRuns() {
        return runs;
    }

    @Override
    protected void writeString(String text, List<TextPosition> textPositions) throws IOException {
        if (textPositions == null || textPositions.isEmpty()) {
            super.writeString(text, textPositions);
            return;
        }
        TextPosition first = textPositions.get(0);
        float fontSize = first.getFontSizeInPt();
        String fontName = first.getFont() != null && first.getFont().getName() != null
                ? first.getFont().getName()
                : "";
        float y = first.getYDirAdj();
        runs.add(new Run(text, fontSize, fontName, getCurrentPageNo(), y));
        super.writeString(text, textPositions);
    }
}
