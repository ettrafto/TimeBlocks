package com.timeblocks.jpa;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDate;

@Converter(autoApply = false)
public class LocalDateStringConverter implements AttributeConverter<LocalDate, String> {

    @Override
    public String convertToDatabaseColumn(LocalDate attribute) {
        return attribute != null ? attribute.toString() : null;
    }

    @Override
    public LocalDate convertToEntityAttribute(String dbData) {
        return (dbData == null || dbData.isBlank()) ? null : LocalDate.parse(dbData);
    }
}


