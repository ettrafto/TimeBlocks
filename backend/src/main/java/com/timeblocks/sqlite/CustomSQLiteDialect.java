package com.timeblocks.sqlite;

import org.hibernate.community.dialect.SQLiteDialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.type.SqlTypes;

public class CustomSQLiteDialect extends SQLiteDialect {

    public CustomSQLiteDialect() {
        super();
    }

    public CustomSQLiteDialect(DialectResolutionInfo info) {
        super(info);
    }

    @Override
    protected String columnType(int sqlTypeCode) {
        return switch (sqlTypeCode) {
            case SqlTypes.BIGINT, SqlTypes.INTEGER, SqlTypes.SMALLINT, SqlTypes.TINYINT, SqlTypes.BOOLEAN, SqlTypes.BIT -> "integer";
            default -> super.columnType(sqlTypeCode);
        };
    }
}



