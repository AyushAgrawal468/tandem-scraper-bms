package com.bms.controller;

import com.bms.model.Event;
import com.bms.repository.EventRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/scrape")
public class ScrapeController {

    private final EventRepository eventRepo;

    public ScrapeController(EventRepository eventRepo) {
        this.eventRepo = eventRepo;
    }

    @PostMapping("/bookmyshow")
    public ResponseEntity<?> scrapeBookMyShow() {
        try {
            URL url = new URL("http://localhost:3001/scrape");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            String payload = "{\"baseUrl\": \"https://in.bookmyshow.com/explore/home\"}";
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload.getBytes());
            }

            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder responseSB = new StringBuilder();
            String line;
            while ((line = in.readLine()) != null) responseSB.append(line);
            in.close();

            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule()); // Important!

            // Deserialize JSON into List<Event>
            List<Map<String, Object>> rawList = mapper.readValue(responseSB.toString(), new TypeReference<>() {});
            List<Event> eventList = new ArrayList<>();

            for (Map<String, Object> raw : rawList) {
                Event event = new Event();
                event.setTitle((String) raw.get("title"));
                event.setCategory((String) raw.get("category"));
                event.setLocation((String) raw.get("location"));
                event.setImageUrl((String) raw.get("image"));

                String dateStr = (String) raw.get("eventDate");
                try {
                    if (dateStr != null && !"TBD".equalsIgnoreCase(dateStr)) {

                        event.setEventDate(dateStr); // Valid date string
                    } else {
                        event.setEventDate(null); // or set default LocalDate.now() if needed
                    }
                }catch(Exception ex){
                    System.out.println("error in event date"+ex);
                    event.setEventDate(null);
                }
                event.setScrapedAt(LocalDateTime.now());

                eventList.add(event);
            }


            // Save to DB
            eventRepo.saveAll(eventList);

            return ResponseEntity.ok("✅ Events scraped and saved: " + eventList.size());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }
}