package com.pdfanalyzer;

import java.util.HashMap;
import java.util.Map;

public class Block {
    public final String type;
    public final String text;
    public final int page;
    public final Integer level;

    public Block(String type, String text, int page, Integer level) {
        this.type = type;
        this.text = text;
        this.page = page;
        this.level = level;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new HashMap<>();
        m.put("type", type);
        m.put("text", text);
        m.put("page", page);
        if (level != null) m.put("level", level);
        return m;
    }
}
