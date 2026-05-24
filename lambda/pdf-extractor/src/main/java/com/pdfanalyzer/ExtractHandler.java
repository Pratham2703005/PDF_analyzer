package com.pdfanalyzer;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

public class ExtractHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {

    private static final float HEADING_SIZE_RATIO = 1.15f;
    private static final float BOLD_HEADING_MIN_RATIO = 0.95f;
    private static final int BOLD_HEADING_MAX_CHARS = 120;
    private static final int MAX_HEADING_LEVELS = 3;
    private static final float PARAGRAPH_GAP_RATIO = 1.5f;

    @Override
    public Map<String, Object> handleRequest(Map<String, Object> input, Context context) {
        String pdfBase64 = (String) input.get("pdfBase64");
        String fileName = (String) input.getOrDefault("fileName", "document.pdf");

        if (pdfBase64 == null || pdfBase64.isEmpty()) {
            throw new RuntimeException("Missing required input field: pdfBase64");
        }

        byte[] pdfBytes = Base64.getDecoder().decode(pdfBase64);

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            FontAnalyzingStripper stripper = new FontAnalyzingStripper();
            stripper.getText(document);

            List<FontAnalyzingStripper.Run> runs = stripper.getRuns();
            float bodyFont = detectBodyFontSize(runs);
            List<Float> headingSizes = collectHeadingSizes(runs, bodyFont);
            List<Block> blocks = assembleBlocks(runs, bodyFont, headingSizes);

            String extractedText = blocks.stream()
                    .map(b -> b.text)
                    .collect(Collectors.joining("\n\n"))
                    .trim();

            Map<String, Object> response = new HashMap<>();
            response.put("extractedText", extractedText);
            response.put("numPages", document.getNumberOfPages());
            response.put("fileName", fileName);
            response.put("blocks", blocks.stream().map(Block::toMap).collect(Collectors.toList()));
            return response;
        } catch (Exception e) {
            throw new RuntimeException("PDFBox extraction failed: " + e.getMessage(), e);
        }
    }

    private static boolean isBold(String fontName) {
        if (fontName == null) return false;
        String upper = fontName.toUpperCase(Locale.ROOT);
        return upper.contains("BOLD") || upper.contains("BLACK") || upper.contains("HEAVY");
    }

    private static float detectBodyFontSize(List<FontAnalyzingStripper.Run> runs) {
        Map<Integer, Long> hist = new HashMap<>();
        for (FontAnalyzingStripper.Run r : runs) {
            int bucket = Math.round(r.fontSize * 2f);
            hist.merge(bucket, (long) r.text.length(), Long::sum);
        }
        return hist.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(e -> e.getKey() / 2f)
                .orElse(10f);
    }

    private static boolean isHeadingRun(FontAnalyzingStripper.Run r, float bodyFont) {
        if (r.fontSize >= bodyFont * HEADING_SIZE_RATIO) return true;
        if (isBold(r.fontName)
                && r.fontSize >= bodyFont * BOLD_HEADING_MIN_RATIO
                && r.text.trim().length() < BOLD_HEADING_MAX_CHARS
                && !r.text.trim().isEmpty()) {
            return true;
        }
        return false;
    }

    private static List<Float> collectHeadingSizes(List<FontAnalyzingStripper.Run> runs, float bodyFont) {
        List<Float> distinct = runs.stream()
                .filter(r -> isHeadingRun(r, bodyFont))
                .map(r -> Math.round(r.fontSize * 2f) / 2f)
                .distinct()
                .sorted((a, b) -> Float.compare(b, a))
                .limit(MAX_HEADING_LEVELS)
                .collect(Collectors.toList());
        return distinct;
    }

    private static int headingLevel(float size, List<Float> headingSizes) {
        float bucket = Math.round(size * 2f) / 2f;
        for (int i = 0; i < headingSizes.size(); i++) {
            if (bucket >= headingSizes.get(i) - 0.01f) return i + 1;
        }
        return headingSizes.size();
    }

    private static List<Block> assembleBlocks(
            List<FontAnalyzingStripper.Run> runs,
            float bodyFont,
            List<Float> headingSizes) {

        List<Block> blocks = new ArrayList<>();
        StringBuilder paragraphBuf = new StringBuilder();
        int paragraphPage = -1;
        float prevY = Float.NaN;
        int prevPage = -1;
        float paragraphGapThreshold = bodyFont * PARAGRAPH_GAP_RATIO;

        for (FontAnalyzingStripper.Run r : runs) {
            String runText = r.text.trim();
            if (runText.isEmpty()) continue;

            boolean heading = isHeadingRun(r, bodyFont);

            if (heading) {
                flushParagraph(blocks, paragraphBuf, paragraphPage);
                paragraphBuf.setLength(0);
                paragraphPage = -1;
                int lvl = headingLevel(r.fontSize, headingSizes);
                blocks.add(new Block("heading", runText, r.page, lvl));
                prevY = r.y;
                prevPage = r.page;
                continue;
            }

            boolean newParagraph = paragraphBuf.length() == 0
                    || r.page != prevPage
                    || (!Float.isNaN(prevY) && Math.abs(r.y - prevY) > paragraphGapThreshold);

            if (newParagraph && paragraphBuf.length() > 0) {
                flushParagraph(blocks, paragraphBuf, paragraphPage);
                paragraphBuf.setLength(0);
                paragraphPage = -1;
            }

            if (paragraphBuf.length() == 0) {
                paragraphPage = r.page;
                paragraphBuf.append(runText);
            } else {
                paragraphBuf.append(' ').append(runText);
            }
            prevY = r.y;
            prevPage = r.page;
        }
        flushParagraph(blocks, paragraphBuf, paragraphPage);
        return blocks;
    }

    private static void flushParagraph(List<Block> blocks, StringBuilder buf, int page) {
        String text = buf.toString().trim().replaceAll("\\s+", " ");
        if (!text.isEmpty() && page > 0) {
            blocks.add(new Block("paragraph", text, page, null));
        }
    }
}
