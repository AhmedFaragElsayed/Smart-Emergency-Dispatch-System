package com.emergency.dispatch.dto;

import lombok.Data;

@Data
public class ReportRow {
    private String label;
    private String value;

    public ReportRow() {
    }

    public ReportRow(String label, String value) {
        this.label = label;
        this.value = value;
    }

}
