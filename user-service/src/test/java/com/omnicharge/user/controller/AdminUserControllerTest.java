package com.omnicharge.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omnicharge.user.dto.UserProfileResponse;
import com.omnicharge.user.service.IUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminUserController.class)
@AutoConfigureMockMvc(addFilters = false)
class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IUserService userService;

    @MockitoBean
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;

    @MockitoBean
    private org.springframework.data.jpa.mapping.JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    void getAllUsers_Success() throws Exception {
        Page<UserProfileResponse> page = new PageImpl<>(Collections.emptyList());
        when(userService.getAllUsers(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/admin/users")
                .param("page", "0")
                .param("size", "10")
                .param("sortBy", "id")
                .param("sortDir", "ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getUserById_Success() throws Exception {
        UserProfileResponse user = new UserProfileResponse();
        user.setId(1L);
        when(userService.getUserById(anyLong())).thenReturn(user);

        mockMvc.perform(get("/api/admin/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    void toggleUserStatus_Success() throws Exception {
        mockMvc.perform(put("/api/admin/users/1/status")
                .param("active", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
