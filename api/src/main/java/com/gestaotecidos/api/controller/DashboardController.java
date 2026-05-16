package com.gestaotecidos.api.controller;

import com.gestaotecidos.api.dto.DashboardDtos;
import com.gestaotecidos.api.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<DashboardDtos.StatsResponse> getStats() {
        return ResponseEntity.ok(dashboardService.getStats());
    }

    @GetMapping("/sales-trend")
    @PreAuthorize("hasAuthority('order:read')")
    public ResponseEntity<List<DashboardDtos.SalesByDayResponse>> getSalesTrend() {
        return ResponseEntity.ok(dashboardService.getSalesTrend());
    }
}