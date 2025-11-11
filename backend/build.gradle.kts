plugins {
    id("org.springframework.boot") version "3.3.3"
    id("io.spring.dependency-management") version "1.1.5"
    java
}

group = "com.timeblocks"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.flywaydb:flyway-core")
    implementation("org.xerial:sqlite-jdbc:3.46.0.0")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.hibernate.orm:hibernate-community-dialects")
    implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")
    implementation("io.jsonwebtoken:jjwt-api:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.5")

    // optional: lombok (if you want getters/setters/constructors)
    compileOnly("org.projectlombok:lombok:1.18.32")
    annotationProcessor("org.projectlombok:lombok:1.18.32")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}

// Ensure Spring Boot runs with the Java 21 toolchain, not whatever JAVA_HOME points to
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    javaLauncher.set(javaToolchains.launcherFor {
        languageVersion.set(JavaLanguageVersion.of(21))
    })
}

tasks.register("devCleanDb") {
    group = "dev"
    doLast {
        val db = file("$projectDir/timeblocks-dev.sqlite")
        val wal = file("$projectDir/timeblocks-dev.sqlite-wal")
        val shm = file("$projectDir/timeblocks-dev.sqlite-shm")
        listOf(db, wal, shm).forEach { if (it.exists()) it.delete() }
        println("Deleted dev SQLite files.")
    }
}

