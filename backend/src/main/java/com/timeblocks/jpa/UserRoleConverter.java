package com.timeblocks.jpa;

import com.timeblocks.model.UserRole;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class UserRoleConverter implements AttributeConverter<UserRole, String> {
    @Override
    public String convertToDatabaseColumn(UserRole attribute) {
        return attribute != null ? attribute.name().toLowerCase() : null;
    }

    @Override
    public UserRole convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        return UserRole.valueOf(dbData.trim().toUpperCase());
    }
}


