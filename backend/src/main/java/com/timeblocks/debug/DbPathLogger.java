package com.timeblocks.debug;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class DbPathLogger {
  private static final Logger log = LoggerFactory.getLogger(DbPathLogger.class);

  @Value("${spring.datasource.url:}")
  String url;

  @PostConstruct
  public void printPath() {
    if (url != null && url.startsWith("jdbc:sqlite:")) {
      String p = url.substring("jdbc:sqlite:".length());
      try {
        File f = new File(p);
        log.info("SQLite path (absolute) = {}", f.getAbsolutePath());
      } catch (Exception e) {
        log.warn("Failed to resolve SQLite path from {}", url, e);
      }
    }
  }
}


