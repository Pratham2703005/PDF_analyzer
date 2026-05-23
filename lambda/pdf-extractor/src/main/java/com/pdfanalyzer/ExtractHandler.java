package com.pdfanalyzer;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

public class ExtractHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {

    @Override
    public Map<String, Object> handleRequest(Map<String, Object> input, Context context) {
        Map<String, Object> response = new HashMap<>();

        String pdfBase64 = (String) input.get("pdfBase64");
        String fileName = (String) input.getOrDefault("fileName", "document.pdf");

        if (pdfBase64 == null || pdfBase64.isEmpty()) {
            throw new RuntimeException("Missing required input field: pdfBase64");
        }

        byte[] pdfBytes = Base64.getDecoder().decode(pdfBase64);

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(document);
            String normalized = text.trim().replaceAll("(\\r?\\n\\s*){3,}", "\n\n");

            response.put("extractedText", normalized);
            response.put("numPages", document.getNumberOfPages());
            response.put("fileName", fileName);
            return response;
        } catch (Exception e) {
            throw new RuntimeException("PDFBox extraction failed: " + e.getMessage(), e);
        }
    }
}
