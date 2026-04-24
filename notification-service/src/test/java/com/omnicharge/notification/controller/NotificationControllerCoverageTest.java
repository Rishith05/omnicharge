package com.omnicharge.notification.controller;

import com.omnicharge.notification.service.INotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NotificationController.class)
@AutoConfigureMockMvc(addFilters = false)
class NotificationControllerCoverageTest {

    @MockitoBean
    private INotificationService notificationService;
    @MockitoBean
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;
    @MockitoBean
    private org.springframework.data.jpa.mapping.JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getUserNotifications_WithSorting() throws Exception {
        when(notificationService.getUserNotifications(anyLong(), any())).thenReturn(org.springframework.data.domain.Page.empty());

        mockMvc.perform(get("/api/notifications")
                .header("X-User-Id", "1")
                .param("sortDir", "ASC"))
                .andExpect(status().isOk());
    }

    @Test
    void markAsReadAndCount() throws Exception {
        when(notificationService.getUnreadCount(anyLong())).thenReturn(5L);

        mockMvc.perform(put("/api/notifications/1/read")
                .header("X-User-Id", "1"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/notifications/unread-count")
                .header("X-User-Id", "1"))
                .andExpect(status().isOk());
    }
}
