package com.timeblocks.cli;

import com.timeblocks.TimeBlocksApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * Lightweight CLI entrypoint that boots the Spring context without starting
 * the web server, allowing us to run the dev admin seeder on demand (e.g. as
 * part of the reset-backend script).
 */
public final class SeedAdminCli {

    private SeedAdminCli() {
        // utility
    }

    public static void main(String[] args) {
        int exitCode = 0;
        ConfigurableApplicationContext context = null;
        try {
            context = new SpringApplicationBuilder(TimeBlocksApplication.class)
                    .profiles("dev")
                    .web(WebApplicationType.NONE)
                    .logStartupInfo(false)
                    .run(args);
        } catch (Exception ex) {
            exitCode = 1;
            System.err.println("[SeedAdminCli] Failed to seed admin account: " + ex.getMessage());
            ex.printStackTrace(System.err);
        } finally {
            if (context != null) {
                context.close();
            }
        }
        if (exitCode == 0) {
            System.out.println("[SeedAdminCli] Admin account seed completed successfully.");
            System.out.println("  email   : admin@local.test");
            System.out.println("  password: Admin123!");
        }
        System.exit(exitCode);
    }
}

