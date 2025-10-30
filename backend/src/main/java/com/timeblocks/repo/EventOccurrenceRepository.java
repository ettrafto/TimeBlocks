package com.timeblocks.repo;

import com.timeblocks.model.EventOccurrence;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventOccurrenceRepository extends JpaRepository<EventOccurrence, String> { }

