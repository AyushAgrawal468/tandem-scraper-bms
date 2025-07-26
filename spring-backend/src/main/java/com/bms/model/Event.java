package com.bms.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String category;
    private String imageUrl;
    private String location;

    @Column(name = "event_date")
    private String eventDate;

    @Column(name = "scraped_at")
    private LocalDateTime scrapedAt;
}