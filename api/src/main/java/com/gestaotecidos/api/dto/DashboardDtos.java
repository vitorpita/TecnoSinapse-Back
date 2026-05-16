package com.gestaotecidos.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class DashboardDtos {

    public static class StatsResponse {
        @JsonProperty("totalSalesMonth")
        private double totalSalesMonth;

        @JsonProperty("totalSalesDay")
        private double totalSalesDay;

        @JsonProperty("ordersDay")
        private int ordersDay;

        @JsonProperty("averageTicket")
        private double averageTicket;

        @JsonProperty("activeClients")
        private int activeClients;

        @JsonProperty("totalProducts")
        private int totalProducts;

        @JsonProperty("totalStock")
        private int totalStock;

        @JsonProperty("pendingOrders")
        private int pendingOrders;

        @JsonProperty("salesByDay")
        private List<SalesByDayResponse> salesByDay;

        public StatsResponse() {
        }

        public StatsResponse(double totalSalesMonth, double totalSalesDay, int ordersDay,
                             double averageTicket, int activeClients, int totalProducts,
                             int totalStock, int pendingOrders, List<SalesByDayResponse> salesByDay) {
            this.totalSalesMonth = totalSalesMonth;
            this.totalSalesDay = totalSalesDay;
            this.ordersDay = ordersDay;
            this.averageTicket = averageTicket;
            this.activeClients = activeClients;
            this.totalProducts = totalProducts;
            this.totalStock = totalStock;
            this.pendingOrders = pendingOrders;
            this.salesByDay = salesByDay;
        }

        public double getTotalSalesMonth() {
            return totalSalesMonth;
        }

        public double getTotalSalesDay() {
            return totalSalesDay;
        }

        public int getOrdersDay() {
            return ordersDay;
        }

        public double getAverageTicket() {
            return averageTicket;
        }

        public int getActiveClients() {
            return activeClients;
        }

        public int getTotalProducts() {
            return totalProducts;
        }

        public int getTotalStock() {
            return totalStock;
        }

        public int getPendingOrders() {
            return pendingOrders;
        }

        public List<SalesByDayResponse> getSalesByDay() {
            return salesByDay;
        }

        public void setTotalSalesMonth(double totalSalesMonth) {
            this.totalSalesMonth = totalSalesMonth;
        }

        public void setTotalSalesDay(double totalSalesDay) {
            this.totalSalesDay = totalSalesDay;
        }

        public void setOrdersDay(int ordersDay) {
            this.ordersDay = ordersDay;
        }

        public void setAverageTicket(double averageTicket) {
            this.averageTicket = averageTicket;
        }

        public void setActiveClients(int activeClients) {
            this.activeClients = activeClients;
        }

        public void setTotalProducts(int totalProducts) {
            this.totalProducts = totalProducts;
        }

        public void setTotalStock(int totalStock) {
            this.totalStock = totalStock;
        }

        public void setPendingOrders(int pendingOrders) {
            this.pendingOrders = pendingOrders;
        }

        public void setSalesByDay(List<SalesByDayResponse> salesByDay) {
            this.salesByDay = salesByDay;
        }
    }

    public static class SalesByDayResponse {
        @JsonProperty("date")
        private String date;

        @JsonProperty("value")
        private double value;

        public SalesByDayResponse() {
        }

        public SalesByDayResponse(String date, double value) {
            this.date = date;
            this.value = value;
        }

        public String getDate() {
            return date;
        }

        public double getValue() {
            return value;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public void setValue(double value) {
            this.value = value;
        }
    }
}